"""
CuffedOrNot offline matching script — Sprint 7
Run locally before the April 1 event after admin closes opt-in.

Usage:
    python run_matching.py --env ../.env.local [--dry-run]

IMPORTANT: Before running, whitelist your current IP in MongoDB Atlas:
    Atlas dashboard -> Security -> Network Access -> Add IP Address
    This takes ~30 seconds but is easy to forget under event pressure.
    If your IP changes (home -> campus), re-whitelist before running.

NOTE: MongoDB transactions require a replica set. Atlas clusters are
replica sets by default. A standalone local mongod will fail.
"""

import argparse
import math
import multiprocessing
import os
import sys
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Startup import check — fail fast with a clear pip install hint
# ---------------------------------------------------------------------------
try:
    import numpy as np
    from scipy.optimize import linear_sum_assignment
    from pymongo import MongoClient, UpdateOne
    from dotenv import dotenv_values
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install numpy scipy pymongo dnspython python-dotenv")
    print("Or:  bash scripts/setup.sh   (Unix)")
    print("Or:  scripts\\setup.bat       (Windows)")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GHOST_EMAIL = "mcgraw-tower-ghost@cornell.edu"
SMALL_POOL_THRESHOLD = 10
WEIGHTS = {"genre": 0.40, "rentfrow": 0.30, "mood": 0.20, "es": 0.10}
MOOD_MATCH = 1.0
MOOD_MISS = 0.3


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class MatchResult:
    email_a: str
    email_b: str
    score: float
    platonic: bool = False
    ghost: bool = False


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
def load_env(env_path: str) -> str:
    """Load env file and return MONGODB_URI. Exits if missing."""
    path = os.path.abspath(env_path)
    if not os.path.exists(path):
        sys.exit(f"ERROR: env file not found at {path}")
    cfg = dotenv_values(path)
    uri = cfg.get("MONGODB_URI")
    if not uri:
        sys.exit("ERROR: MONGODB_URI not set in env file.")
    return uri


def load_users(db) -> list[dict]:
    """Load all eligible users: optIn + profileComplete + Spotify data collected."""
    cursor = db["cuffedornot_users"].find({
        "optIn": True,
        "profileComplete": True,
        "spotifyData.collectedAt": {"$exists": True, "$ne": None},
    })
    return list(cursor)


# ---------------------------------------------------------------------------
# User sanitization — all NaN guards live here, once
# Downstream code reads only _* keys, never raw MongoDB fields.
# ---------------------------------------------------------------------------
def get_genre_set(user: dict) -> frozenset:
    """Extract genre set with longTerm → mediumTerm → shortTerm fallback."""
    sd = user.get("spotifyData") or {}
    for term in ("longTerm", "mediumTerm", "shortTerm"):
        tdata = sd.get(term)
        if tdata:
            genres = tdata.get("topGenres") or []
            if genres:
                return frozenset(g["genre"] for g in genres if g.get("genre"))
    return frozenset()


def sanitize_user(user: dict) -> dict:
    """
    Normalize raw MongoDB doc into clean _* fields.
    Called once per user before any computation.
    """
    scores = user.get("scores") or {}
    profile = user.get("profile") or {}

    # esValue: None or NaN → 0.0 (neutral)
    es = scores.get("esValue")
    if es is None or (isinstance(es, float) and math.isnan(es)):
        es = 0.0
    user["_es"] = float(np.clip(es, -1.0, 1.0))

    # rentfrowVector: missing → [0,0,0,0]; NaN → 0.0; pad/truncate to length 4
    rv = scores.get("rentfrowVector") or [0.0, 0.0, 0.0, 0.0]
    rv = np.nan_to_num(np.array(rv, dtype=float), nan=0.0)
    if len(rv) < 4:
        rv = np.pad(rv, (0, 4 - len(rv)))
    user["_rv"] = rv[:4]

    # moodQuadrant: missing → "Unknown" (never matches any real quadrant → 0.3 score)
    user["_mq"] = scores.get("moodQuadrant") or "Unknown"

    # genre set
    user["_genres"] = get_genre_set(user)

    # profile fields
    user["_gender"] = profile.get("genderIdentity") or "Prefer not to say"
    user["_attraction"] = profile.get("attractionPreference") or []
    user["_platonic"] = bool(profile.get("openToPlatonic", False))

    return user


# ---------------------------------------------------------------------------
# Jaccard worker — must be top-level for multiprocessing.Pool pickling
# ---------------------------------------------------------------------------
def jaccard_pair(args: tuple) -> float:
    """Genre Jaccard similarity for one (frozenset, frozenset) pair."""
    a, b = args
    if not a and not b:
        return 0.0
    union = len(a | b)
    return len(a & b) / union if union else 0.0


# ---------------------------------------------------------------------------
# Score matrix construction
# ---------------------------------------------------------------------------
def build_score_matrix(users: list[dict]) -> np.ndarray:
    """
    Build an (n x n) compatibility score matrix.
    Vectorized where possible; multiprocessing Pool for genre Jaccard.
    Asserts no NaN before returning.
    """
    n = len(users)

    # --- Extract arrays once ---
    rv_matrix = np.array([u["_rv"] for u in users])   # (n, 4)
    es_vec = np.array([u["_es"] for u in users])       # (n,)
    mq_arr = np.array([u["_mq"] for u in users])       # (n,) object dtype
    genre_sets = [u["_genres"] for u in users]

    # --- Rentfrow similarity (vectorized) ---
    # euclidean dist via broadcasting, then clip to [0, 1]
    diff = rv_matrix[:, np.newaxis, :] - rv_matrix[np.newaxis, :, :]  # (n,n,4)
    dist = np.linalg.norm(diff, axis=-1)                               # (n,n)
    rentfrow_sim = np.clip(1.0 - dist, 0.0, 1.0)

    # Zero-norm guard: all-zero vector → set that user's row/col to 0.5 (neutral)
    norms = np.linalg.norm(rv_matrix, axis=1)
    zero_mask = norms == 0.0
    if np.any(zero_mask):
        rentfrow_sim[zero_mask, :] = 0.5
        rentfrow_sim[:, zero_mask] = 0.5
        np.fill_diagonal(rentfrow_sim, 1.0)  # self-similarity (filtered out later)

    # --- ES similarity (vectorized) ---
    es_diff = np.abs(es_vec[:, np.newaxis] - es_vec[np.newaxis, :])  # (n,n)
    es_sim = 1.0 - es_diff / 2.0

    # --- Mood quadrant similarity (vectorized string comparison) ---
    mood_sim = np.where(
        mq_arr[:, np.newaxis] == mq_arr[np.newaxis, :],
        MOOD_MATCH,
        MOOD_MISS,
    ).astype(float)

    # --- Genre Jaccard (multiprocessing — set ops can't vectorize) ---
    # Only compute upper triangle, mirror to lower
    pairs = [(i, j) for i in range(n) for j in range(i, n)]
    pair_args = [(genre_sets[i], genre_sets[j]) for i, j in pairs]

    cpu_count = max(1, multiprocessing.cpu_count() - 1)
    with multiprocessing.Pool(processes=cpu_count) as pool:
        results = pool.map(jaccard_pair, pair_args)

    genre_sim = np.zeros((n, n), dtype=float)
    for (i, j), v in zip(pairs, results):
        genre_sim[i, j] = v
        genre_sim[j, i] = v

    # --- Weighted combination ---
    score_matrix = (
        WEIGHTS["genre"]    * genre_sim
        + WEIGHTS["rentfrow"] * rentfrow_sim
        + WEIGHTS["mood"]   * mood_sim
        + WEIGHTS["es"]     * es_sim
    )

    # --- Sanity check: no NaN should survive sanitize_user ---
    if np.isnan(score_matrix).any():
        bad = list(zip(*np.where(np.isnan(score_matrix))))[:5]
        raise ValueError(
            f"NaN detected in score_matrix at positions {bad}. "
            "Check sanitize_user() for the affected users."
        )

    return score_matrix


# ---------------------------------------------------------------------------
# Preference helpers
# ---------------------------------------------------------------------------
def can_see(a: dict, b: dict) -> bool:
    """True if user a's attraction preference includes user b's gender identity."""
    return "Everyone" in a["_attraction"] or b["_gender"] in a["_attraction"]


def valid_romantic_pair(a: dict, b: dict) -> bool:
    """Mutual attraction preference match, not the same user."""
    return a["email"] != b["email"] and can_see(a, b) and can_see(b, a)


# ---------------------------------------------------------------------------
# Matching passes
# ---------------------------------------------------------------------------
def run_romantic_pass(
    users: list[dict],
    score_matrix: np.ndarray,
) -> tuple[list[MatchResult], list[int]]:
    """
    Optimal romantic matching via scipy linear_sum_assignment.
    Returns (matches, unmatched_indices).
    """
    n = len(users)
    cost = -score_matrix.copy()

    # Invalidate same-user and preference-mismatched pairs
    for i in range(n):
        for j in range(n):
            if i == j or not valid_romantic_pair(users[i], users[j]):
                cost[i, j] = 1e9  # large finite cost — NOT np.inf (scipy compat)

    row_ind, col_ind = linear_sum_assignment(cost)

    matched: set[int] = set()
    matches: list[MatchResult] = []
    for r, c in zip(row_ind, col_ind):
        if (
            score_matrix[r, c] > 0
            and r != c
            and r not in matched
            and c not in matched
        ):
            matches.append(MatchResult(
                email_a=users[r]["email"],
                email_b=users[c]["email"],
                score=float(score_matrix[r, c]),
            ))
            matched |= {r, c}

    unmatched = [i for i in range(n) if i not in matched]
    return matches, unmatched


def run_platonic_pass(
    unmatched_indices: list[int],
    score_matrix: np.ndarray,
    users: list[dict],
) -> tuple[list[MatchResult], list[int]]:
    """
    Optimal platonic matching for unmatched users who opted into platonic.
    No preference filter — any unmatched platonic-open user can pair with any other.
    Returns (matches, still_unmatched_indices).
    """
    eligible = [i for i in unmatched_indices if users[i]["_platonic"]]
    if len(eligible) < 2:
        return [], unmatched_indices

    sub = score_matrix[np.ix_(eligible, eligible)]
    cost = -sub.copy()
    np.fill_diagonal(cost, 1e9)

    row_ind, col_ind = linear_sum_assignment(cost)

    matched_local: set[int] = set()
    matches: list[MatchResult] = []
    for r, c in zip(row_ind, col_ind):
        if (
            sub[r, c] > 0
            and r != c
            and r not in matched_local
            and c not in matched_local
        ):
            matches.append(MatchResult(
                email_a=users[eligible[r]]["email"],
                email_b=users[eligible[c]]["email"],
                score=float(sub[r, c]),
                platonic=True,
            ))
            matched_local |= {r, c}

    matched_global = {eligible[i] for i in matched_local}
    still_unmatched = [i for i in unmatched_indices if i not in matched_global]
    return matches, still_unmatched


def assign_ghost(remaining: list[int], users: list[dict]) -> list[MatchResult]:
    """Assign the lone leftover user (if any) to the McGraw Tower ghost."""
    if not remaining:
        return []
    ghost_idx = remaining[-1]
    email = users[ghost_idx]["email"]
    print(f"Ghost match assigned to {email}")
    return [MatchResult(
        email_a=GHOST_EMAIL,
        email_b=email,
        score=0.0,
        ghost=True,
    )]


def run_small_pool(users: list[dict]) -> list[MatchResult]:
    """
    Simplified matching for pools < SMALL_POOL_THRESHOLD.
    Skips romantic/platonic distinction; matches purely on moodQuadrant.
    """
    print(f"WARNING: Small pool ({len(users)} users < {SMALL_POOL_THRESHOLD}) "
          "— using simplified moodQuadrant matching.")
    n = len(users)
    cost = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i == j:
                cost[i, j] = 1e9
            elif users[i]["_mq"] == users[j]["_mq"]:
                cost[i, j] = 0.0   # same quadrant → best (cost minimizer)
            else:
                cost[i, j] = 1.0   # different quadrant → worse

    row_ind, col_ind = linear_sum_assignment(cost)
    matched: set[int] = set()
    matches: list[MatchResult] = []
    for r, c in zip(row_ind, col_ind):
        if r not in matched and c not in matched and r != c:
            same_q = users[r]["_mq"] == users[c]["_mq"]
            matches.append(MatchResult(
                email_a=users[r]["email"],
                email_b=users[c]["email"],
                score=1.0 if same_q else 0.0,
            ))
            matched |= {r, c}

    remaining = [i for i in range(n) if i not in matched]
    matches += assign_ghost(remaining, users)
    return matches


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------
def print_preview(matches: list[MatchResult], users: list[dict]) -> None:
    """Print the match table and summary counts before writing."""
    eligible_emails = {u["email"] for u in users}
    matched_emails: set[str] = set()
    romantic_count = platonic_count = ghost_count = 0

    print("\nMATCH PREVIEW")
    print("=" * 70)
    for m in matches:
        if m.ghost:
            tag = "[ghost]"
            ghost_count += 1
            a_label = f"[GHOST] {m.email_a}"
        elif m.platonic:
            tag = "[platonic]"
            platonic_count += 1
            a_label = m.email_a
        else:
            tag = f"score={m.score:.3f}"
            romantic_count += 1
            a_label = m.email_a

        print(f"{a_label:<50}  ↔  {m.email_b:<40}  {tag}")
        matched_emails.add(m.email_a)
        matched_emails.add(m.email_b)

    # Unmatched: eligible users not in any match (ghost target counts as matched)
    unmatched_count = len(eligible_emails - matched_emails)

    print()
    print(f"Romantic matches:  {romantic_count:>4}")
    print(f"Platonic matches:  {platonic_count:>4}")
    print(f"Unmatched:         {unmatched_count:>4}")
    print(f"Ghost matches:     {ghost_count:>4}")
    print()


# ---------------------------------------------------------------------------
# MongoDB write (atomic transaction)
# ---------------------------------------------------------------------------
def write_to_mongo(
    client: MongoClient,
    db,
    matches: list[MatchResult],
    users: list[dict],
) -> None:
    """
    Write all match results atomically in a single MongoDB transaction.

    NOTE: Transactions require a replica set. MongoDB Atlas is a replica set
    by default. A standalone local mongod will raise OperationFailure here.
    """
    eligible_emails = {u["email"] for u in users}
    matched_emails: set[str] = set()

    match_ops: list[UpdateOne] = []
    for m in matches:
        matched_emails.add(m.email_a)
        matched_emails.add(m.email_b)
        for mine, theirs in [(m.email_a, m.email_b), (m.email_b, m.email_a)]:
            if mine == GHOST_EMAIL:
                continue  # ghost has no MongoDB document
            match_ops.append(UpdateOne(
                {"email": mine},
                {"$set": {
                    "matchedWith": theirs,
                    "matchPlatonic": m.platonic,
                    "unmatchable": False,
                }},
            ))

    unmatch_ops: list[UpdateOne] = [
        UpdateOne(
            {"email": e},
            {"$set": {"unmatchable": True, "matchedWith": None}},
        )
        for e in eligible_emails - matched_emails
    ]

    # Collection names verified against TypeScript Mongoose models:
    #   cuffedornot_users  → database/models/cuffedornotUser.ts
    #   cuffedornot_config → database/models/cuffedornotConfig.ts
    users_coll = db["cuffedornot_users"]
    config_coll = db["cuffedornot_config"]

    try:
        with client.start_session() as session:
            with session.start_transaction():
                if match_ops:
                    users_coll.bulk_write(match_ops, session=session)
                if unmatch_ops:
                    users_coll.bulk_write(unmatch_ops, session=session)
                config_coll.update_one(
                    {},
                    {"$set": {"matchingRun": True}},
                    upsert=True,
                    session=session,
                )
    except Exception as e:
        print(f"ERROR: Transaction failed — {e}")
        print("No changes were written to MongoDB.")
        sys.exit(1)

    print(f"Wrote {len(match_ops)} match operations, "
          f"{len(unmatch_ops)} unmatch operations.")
    print("matchingRun set to True in cuffedornot_config.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="CuffedOrNot offline matching script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
IMPORTANT — MongoDB Atlas IP whitelist:
  Atlas denies connections from non-whitelisted IPs by default.
  Before running, add your current IP:
    https://cloud.mongodb.com → Security → Network Access → Add IP Address
  This takes ~30 seconds. If you switch networks (e.g. home → campus),
  you must re-whitelist your new IP.

Examples:
  python scripts/run_matching.py --env .env.local --dry-run
  python scripts/run_matching.py --env .env.local
        """,
    )
    parser.add_argument(
        "--env",
        default="../.env.local",
        help="Path to .env.local file (default: ../.env.local)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print match pairs without writing to MongoDB",
    )
    args = parser.parse_args()

    uri = load_env(args.env)

    print("Connecting to MongoDB...")
    client = MongoClient(uri)
    db = client.get_default_database()

    # Guard: warn if matching already ran
    config = db["cuffedornot_config"].find_one({})
    if config and config.get("matchingRun"):
        print("WARNING: matchingRun is already True in cuffedornot_config.")
        resp = input("Matching has already run. Continue anyway? [y/N] ").strip().lower()
        if resp != "y":
            print("Aborted.")
            return

    print("Loading eligible users...")
    raw_users = load_users(db)
    print(f"Loaded {len(raw_users)} eligible users.")

    if not raw_users:
        print("No eligible users found. Exiting.")
        return

    users = [sanitize_user(u) for u in raw_users]

    if len(users) < SMALL_POOL_THRESHOLD:
        matches = run_small_pool(users)
    else:
        print("Building score matrix (this may take a moment for large pools)...")
        score_matrix = build_score_matrix(users)

        print("Running romantic pass...")
        romantic_matches, unmatched = run_romantic_pass(users, score_matrix)

        print("Running platonic pass...")
        platonic_matches, still_unmatched = run_platonic_pass(
            unmatched, score_matrix, users
        )

        ghost_matches = assign_ghost(still_unmatched, users)

        matches = romantic_matches + platonic_matches + ghost_matches

    print_preview(matches, users)

    if args.dry_run:
        print("[DRY RUN] No changes written to MongoDB.")
        return

    resp = input("Write these matches to MongoDB? [y/N] ").strip().lower()
    if resp != "y":
        print("Aborted. No changes written.")
        return

    write_to_mongo(client, db, matches, users)
    print("Done.")


if __name__ == "__main__":
    multiprocessing.freeze_support()  # required on Windows for Pool spawn safety
    main()
