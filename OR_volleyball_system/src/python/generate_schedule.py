import pandas as pd
from gurobipy import Model, GRB, quicksum
from itertools import combinations
import sys
import json
import os
from contextlib import contextmanager

@contextmanager
def suppress_stdout():
    with open(os.devnull, 'w') as devnull:
        old_stdout = sys.stdout
        sys.stdout = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout

def generate_schedule(group_file, availability_file):
    # === 讀取 Excel 資料 ===
    group_data = pd.read_excel(group_file, sheet_name=None)
    grouping_df = group_data["Groupings"]
    ref_conflict_df = group_data["Referee Conflicts"]

    avail_data = pd.read_excel(availability_file, sheet_name=None)
    ref_df = avail_data["ref_available"]
    teams_df = avail_data["team_available"]

    ref_df = ref_df.set_index("name").T
    referees = list(ref_df.columns)
    days = list(ref_df.index.astype(int))
    fields = list(range(4))

    ref_conflict_df = ref_conflict_df.set_index("Referee")
    referee_conflicts = ref_conflict_df.to_dict("index")
    for ref in referee_conflicts:
        referee_conflicts[ref] = {group: int(value) for group, value in referee_conflicts[ref].items()}

    teams_df = teams_df.rename(columns={"Unnamed: 0": "team"})
    team_week_avail = teams_df.set_index("team").to_dict("index")

    grouped_teams = {}
    for group, group_df in grouping_df.groupby("Group"):
        grouped_teams[group] = list(group_df["Team"])

    teams = [team for group in grouped_teams.values() for team in group]

    weekdays = ["mon", "tue", "wed", "thur", "fri"]
    day_to_weekday = {d: weekdays[d % 5] for d in days if d % 5 < 5}
    valid_days = [d for d in days if d % 5 < 5]

    matches = []
    for group, team_list in grouped_teams.items():
        if len(team_list) < 2:
            print(f"⚠️ 警告：Group {group} 只有 {len(team_list)} 支隊伍，無法形成比賽，將不會出現在賽程表中。", file=sys.stderr)
            continue
        for t1, t2 in combinations(team_list, 2):
            matches.append((group, t1, t2))

    with suppress_stdout():
        m = Model("volleyball_schedule")
        m.setParam('OutputFlag', 0)
        m.Params.LogToConsole = 0

        x = {}
        for group, t1, t2 in matches:
            for d in valid_days:
                wd = day_to_weekday[d]
                if team_week_avail[t1][wd] and team_week_avail[t2][wd]:
                    for f in fields:
                        for r in referees:
                            if ref_df.loc[d, r] >= 0.5 and referee_conflicts[r][group] == 1:
                                x[(group, t1, t2, d, f, r)] = m.addVar(vtype=GRB.BINARY)

        makespan = m.addVar(vtype=GRB.INTEGER)

        referee_games = {r: m.addVar(vtype=GRB.INTEGER, name=f"referee_games_{r}") for r in referees}
        for r in referees:
            m.addConstr(referee_games[r] == quicksum(x.get((g, t1, t2, d, f, rr), 0)
                                                    for (g, t1, t2, d, f, rr) in x if rr == r))

        total_matches = len(matches)
        avg_games = total_matches / len(referees) if referees else 0
        deviation_plus = {r: m.addVar(vtype=GRB.CONTINUOUS, name=f"dev_plus_{r}") for r in referees}
        deviation_minus = {r: m.addVar(vtype=GRB.CONTINUOUS, name=f"dev_minus_{r}") for r in referees}

        for r in referees:
            m.addConstr(referee_games[r] == avg_games + deviation_plus[r] - deviation_minus[r])

        for group, t1, t2 in matches:
            m.addConstr(quicksum(x.get((group, t1, t2, d, f, r), 0)
                                 for d in valid_days for f in fields for r in referees
                                 if (group, t1, t2, d, f, r) in x) == 1)

        for d in valid_days:
            for f in fields:
                m.addConstr(quicksum(x.get((g, t1, t2, dd, ff, r), 0)
                                     for (g, t1, t2, dd, ff, r) in x
                                     if dd == d and ff == f) <= 1)

        for d in valid_days:
            for r in referees:
                m.addConstr(quicksum(x.get((g, t1, t2, dd, f, rr), 0)
                                     for (g, t1, t2, dd, f, rr) in x
                                     if dd == d and rr == r) <= 1)

        for t in teams:
            for d in valid_days:
                m.addConstr(quicksum(x.get((g, t1, t2, dd, f, r), 0)
                                     for (g, t1, t2, dd, f, r) in x
                                     if dd == d and (t1 == t or t2 == t)) <= 1)

        for t in teams:
            for week_start in range(min(valid_days), max(valid_days) - 4, 5):
                week_days = [d for d in valid_days if week_start <= d < week_start + 5]
                m.addConstr(quicksum(x.get((g, t1, t2, dd, f, r), 0)
                                     for (g, t1, t2, dd, f, r) in x
                                     if dd in week_days and (t1 == t or t2 == t)) <= 2)

        for t in teams:
            for d in valid_days[:-1]:
                next_day = d + 1
                if next_day in valid_days:
                    m.addConstr(quicksum(x.get((g, t1, t2, dd, f, r), 0)
                                         for (g, t1, t2, dd, f, r) in x
                                         if dd == d and (t1 == t or t2 == t)) +
                                quicksum(x.get((g, t1, t2, dd, f, r), 0)
                                         for (g, t1, t2, dd, f, r) in x
                                         if dd == next_day and (t1 == t or t2 == t)) <= 1)

        for key in x:
            group, t1, t2, d, f, r = key
            m.addConstr(x[key] * d <= makespan)

        penalty = quicksum(0.1 * x[key] for key in x if ref_df.loc[key[3], key[5]] == 0.5)
        balance_penalty = quicksum(deviation_plus[r] + deviation_minus[r] for r in referees)
        m.setObjective(makespan + penalty + 0.01 * balance_penalty, GRB.MINIMIZE)

        m.optimize()

    if m.status == GRB.OPTIMAL:
        result = [(group, t1, t2, d, f, r)
                  for (group, t1, t2, d, f, r), var in x.items() if var.X > 0.5]
        df = pd.DataFrame(result, columns=["Group", "Team1", "Team2", "Day", "Field", "Referee"])
        df["Match"] = df["Team1"] + " vs " + df["Team2"]
        schedule_df = df[["Day", "Field", "Match", "Referee"]].sort_values(by=["Day", "Field"])

        referee_counts = {r: 0 for r in referees}
        for _, row in df.iterrows():
            referee_counts[row["Referee"]] += 1
        referee_counts_df = pd.DataFrame.from_dict(referee_counts, orient='index', columns=["Games Officiated"])
        referee_counts_df.index.name = "Referee"

        with pd.ExcelWriter("volleyball_schedule.xlsx", engine="openpyxl") as writer:
            schedule_df.to_excel(writer, sheet_name="Schedule", index=False)
            grouping_df.to_excel(writer, sheet_name="Groupings", index=False)
            referee_counts_df.to_excel(writer, sheet_name="Referee Counts")

        return {
            "schedule_data": schedule_df.to_dict(orient='records'),
            "ref_count_data": referee_counts_df.reset_index().to_dict(orient='records'),
            "grouping_data": grouping_df.to_dict(orient='records')  # 如果要包含
        }

    else:
        raise ValueError("無可行排程")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python generate_schedule.py <group_file> <availability_file>", file=sys.stderr)
        sys.exit(1)

    group_file = sys.argv[1]
    availability_file = sys.argv[2]

    try:
        result = generate_schedule(group_file, availability_file)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)