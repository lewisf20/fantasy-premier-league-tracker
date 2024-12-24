package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"sync"
)

const (
	LeagueID = 979679

	BaseHistoryURL = "https://fantasy.premierleague.com/api/entry/%d/history/"

	lewisTeamID  = 4243701
	ryanTeamID   = 4160210
	callumTeamID = 3585882
	eliasTeamID  = 4992779
	liamTeamID   = 5133175
	jamieTeamID  = 5045999
	dyTeamID     = 4638425
	jakeTeamID   = 5205282
	elliotTeamID = 6179028
	joeTeamID    = 3274716
	kaiTeamID    = 4912963
)

func main() {

	handleRequests()

	fmt.Println("Starting server at port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println(err)
	}
}

func handleRequests() {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/standings", standingsHandler)
	http.HandleFunc("/history", historyHandler)
	http.HandleFunc("/latest_gameweek", latestGameweekHandler)
}

// get standings

type StandingsResponse struct {
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

func standingsHandler(w http.ResponseWriter, r *http.Request) {
	resp, err := http.Get("https://fantasy.premierleague.com/api/leagues-classic/979679/standings/")
	if err != nil {
		http.Error(w, "Failed to fetch standings", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var standings StandingsResponse
	if err := json.NewDecoder(resp.Body).Decode(&standings); err != nil {
		http.Error(w, "Failed to decode JSON", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(standings); err != nil {
		http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
	}
}

// get history

type HistoryResponse struct {
	Current []struct {
		Event       int `json:"event"`
		Points      int `json:"points"`
		TotalPoints int `json:"total_points"`
	} `json:"current"`
}

type LeagueHistoryData struct {
	TeamID      int `json:"team_id"`
	Gameweek    int `json:"gameweek"`
	Points      int `json:"points"`
	TotalPoints int `json:"total_points"`
	Rank        int `json:"rank"` // Rank in private league
}

// historyHandler fetches the history for each team and filters by game week
func historyHandler(w http.ResponseWriter, r *http.Request) {
	gameWeek := r.URL.Query().Get("gameweek")
	if gameWeek == "" {
		http.Error(w, "Gameweek parameter is required", http.StatusBadRequest)
		return
	}

	teamIDs := []int{
		lewisTeamID,
		ryanTeamID,
		callumTeamID,
		eliasTeamID,
		liamTeamID,
		jamieTeamID,
		dyTeamID,
		jakeTeamID,
		elliotTeamID,
		joeTeamID,
		kaiTeamID,
	}
	var wg sync.WaitGroup
	historyData := make([]LeagueHistoryData, 0)
	mu := sync.Mutex{}

	for _, teamID := range teamIDs {
		wg.Add(1)
		go func(teamID int) {
			defer wg.Done()
			url := fmt.Sprintf(BaseHistoryURL, teamID)
			resp, err := http.Get(url)
			if err != nil {
				fmt.Println("Error fetching history for team:", teamID, err)
				return
			}
			defer resp.Body.Close()

			var history HistoryResponse
			if err := json.NewDecoder(resp.Body).Decode(&history); err != nil {
				fmt.Println("Error decoding history for team:", teamID, err)
				return
			}

			// Filter data for the given gameweek
			for _, gw := range history.Current {
				if fmt.Sprintf("%d", gw.Event) == gameWeek {
					mu.Lock()
					historyData = append(historyData, LeagueHistoryData{
						TeamID:      teamID,
						Gameweek:    gw.Event,
						Points:      gw.Points,
						TotalPoints: gw.TotalPoints,
					})
					mu.Unlock()
					break
				}
			}
		}(teamID)
	}

	wg.Wait()

	// Sort by TotalPoints in descending order
	sort.Slice(historyData, func(i, j int) bool {
		return historyData[i].TotalPoints > historyData[j].TotalPoints
	})

	// Assign ranks based on sorted order
	for i := range historyData {
		historyData[i].Rank = i + 1
	}

	// Return the ranked data as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(historyData); err != nil {
		http.Error(w, "Failed to encode history data", http.StatusInternalServerError)
	}
}

// latestGameweekHandler fetches the history for each team and determines the latest gameweek
func latestGameweekHandler(w http.ResponseWriter, r *http.Request) {
	teamIDs := []int{
		lewisTeamID,
		ryanTeamID,
		callumTeamID,
		eliasTeamID,
		liamTeamID,
		jamieTeamID,
		dyTeamID,
		jakeTeamID,
		elliotTeamID,
		joeTeamID,
		kaiTeamID,
	}
	var wg sync.WaitGroup
	latestGameweek := 0
	mu := sync.Mutex{}

	for _, teamID := range teamIDs {
		wg.Add(1)
		go func(teamID int) {
			defer wg.Done()
			url := fmt.Sprintf(BaseHistoryURL, teamID)
			resp, err := http.Get(url)
			if err != nil {
				fmt.Println("Error fetching history for team:", teamID, err)
				return
			}
			defer resp.Body.Close()

			var history HistoryResponse
			if err := json.NewDecoder(resp.Body).Decode(&history); err != nil {
				fmt.Println("Error decoding history for team:", teamID, err)
				return
			}

			// Find the highest gameweek for this team
			for _, gw := range history.Current {
				mu.Lock()
				if gw.Event > latestGameweek {
					latestGameweek = gw.Event
				}
				mu.Unlock()
			}
		}(teamID)
	}

	wg.Wait()

	// Return the latest gameweek as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]int{"latest_gameweek": latestGameweek}); err != nil {
		http.Error(w, "Failed to encode latest gameweek", http.StatusInternalServerError)
	}
}
