package fpl

type standingsResponse struct {
	NewEntries struct {
		HasNext bool       `json:"has_next"`
		Page    int        `json:"page"`
		Results []struct{} `json:"results"`
	} `json:"new_entries"`
	LastUpdatedData string `json:"last_updated_data"`
	League          struct {
		ID          int    `json:"id"`
		Name        string `json:"name"`
		Created     string `json:"created"`
		Closed      bool   `json:"closed"`
		MaxEntries  *int   `json:"max_entries"`
		LeagueType  string `json:"league_type"`
		Scoring     string `json:"scoring"`
		AdminEntry  int    `json:"admin_entry"`
		StartEvent  int    `json:"start_event"`
		CodePrivacy string `json:"code_privacy"`
		HasCup      bool   `json:"has_cup"`
		CupLeague   *int   `json:"cup_league"`
		Rank        *int   `json:"rank"`
	} `json:"league"`
	Standings struct {
		HasNext bool `json:"has_next"`
		Page    int  `json:"page"`
		Results []struct {
			ID         int    `json:"id"`
			EventTotal int    `json:"event_total"`
			PlayerName string `json:"player_name"`
			Rank       int    `json:"rank"`
			LastRank   int    `json:"last_rank"`
			RankSort   int    `json:"rank_sort"`
			Total      int    `json:"total"`
			Entry      int    `json:"entry"`
			EntryName  string `json:"entry_name"`
			HasPlayed  bool   `json:"has_played"`
		} `json:"results"`
	} `json:"standings"`
}

type historyResponse struct {
	Current []struct {
		Event       int `json:"event"`
		Points      int `json:"points"`
		TotalPoints int `json:"total_points"`
	} `json:"current"`
}
