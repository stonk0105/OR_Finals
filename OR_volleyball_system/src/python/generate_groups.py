import pandas as pd
import random
import sys
import json

def generate_groups(input_file):
    # === 讀取 Excel 資料 ===
    excel_data = pd.read_excel(input_file, sheet_name=None)
    level_df = excel_data["level"]
    ref_team_df = excel_data["ref_team"]

    # === 整理資料 ===
    # Get teams and their levels
    level_df = level_df.rename(columns={"team_name": "team", "level": "level"})
    team_levels = level_df.set_index("team")["level"].to_dict()

    # Randomly assign teams to groups
    teams_by_level = {level: [] for level in range(1, 5)}  # Levels 1 to 4
    for team, level in team_levels.items():
        teams_by_level[level].append(team)

    # Check team availability for groups A to H (levels 1 to 4)
    required_teams_level_1_to_4 = 8  # 8 groups (A to H)
    for level in range(1, 5):
        if len(teams_by_level[level]) < required_teams_level_1_to_4:
            raise ValueError(f"Not enough teams at level {level}: need {required_teams_level_1_to_4}, but only {len(teams_by_level[level])} available.")

    grouped_teams = {}
    # Groups A to H (one from each level 1 to 4)
    for group in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
        selected_teams = [random.choice(teams_by_level[level]) for level in range(1, 5)]
        for team in selected_teams:
            teams_by_level[team_levels[team]].remove(team)
        grouped_teams[group] = selected_teams

    # Group I (3 teams, prefer one from levels 1, 2, 3 if possible)
    remaining_teams = []
    for level in range(1, 5):
        remaining_teams.extend(teams_by_level[level])

    if len(remaining_teams) < 3:
        raise ValueError(f"Not enough remaining teams for group I: need 3, but only {len(remaining_teams)} available.")

    # Try to select one team from each of levels 1, 2, 3
    selected_teams = []
    available_levels = [level for level in range(1, 4) if teams_by_level[level]]
    if len(available_levels) >= 3:
        for level in available_levels[:3]:
            if teams_by_level[level]:
                team = random.choice(teams_by_level[level])
                selected_teams.append(team)
                teams_by_level[level].remove(team)
                remaining_teams.remove(team)
    else:
        # Fallback: randomly select 3 teams from remaining teams
        selected_teams = random.sample(remaining_teams, 3)
        for team in selected_teams:
            if team in remaining_teams:
                remaining_teams.remove(team)
                level = team_levels[team]
                if team in teams_by_level[level]:
                    teams_by_level[level].remove(team)

    grouped_teams['I'] = selected_teams

    # Group J (all remaining teams, regardless of level)
    remaining_teams = []
    for level in range(1, 5):
        remaining_teams.extend(teams_by_level[level])

    if remaining_teams:
        grouped_teams['J'] = remaining_teams
        if len(remaining_teams) < 2:
            print(f"⚠️ 警告：Group J 只有 {len(remaining_teams)} 支隊伍，無法形成比賽。")
    else:
        print("⚠️ 警告：沒有剩餘隊伍可分配到 Group J。")

    # Create DataFrame for groupings
    grouping_data = []
    for group, teams in grouped_teams.items():
        for team in teams:
            grouping_data.append({"Group": group, "Team": team, "Level": team_levels[team]})

    grouping_df = pd.DataFrame(grouping_data)

    # === Generate Referee Conflict Table ===
    # Get unique referees from ref_team
    referees = ref_team_df["name"].unique()

    # Initialize conflict dictionary
    ref_conflicts = {}
    for ref in referees:
        ref_conflicts[ref] = {}

    # Fill conflict table: 0 if referee has conflict with any team in group, 1 otherwise
    for ref in referees:
        conflicted_teams = set(ref_team_df[ref_team_df["name"] == ref]["dept"])
        for group, teams in grouped_teams.items():
            # Check if referee has conflict with any team in the group
            has_conflict = any(team in conflicted_teams for team in teams)
            ref_conflicts[ref][group] = 0 if has_conflict else 1

    # Convert to DataFrame
    ref_conflict_df = pd.DataFrame(ref_conflicts).T
    ref_conflict_df.index.name = "Referee"

    # === 輸出到 Excel ===
    with pd.ExcelWriter("group_generate.xlsx", engine="openpyxl") as writer:
        grouping_df.to_excel(writer, sheet_name="Groupings", index=False)
        ref_conflict_df.to_excel(writer, sheet_name="Referee Conflicts")

    return {
        "grouping_data": grouping_df.to_dict(orient='records'),
        "ref_conflict_data": ref_conflict_df.reset_index().to_dict(orient='records')
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate_groups.py <input_excel_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    try:
        result = generate_groups(input_file)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1) 