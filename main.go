package main

import (
	"encoding/json"
	"fantasy-premier-league-tracker/fpl"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
)

var (
	leagueName         string = "default"
	teamDetailsMapping        = map[int]TeamDetails{}
)

type TeamDetails struct {
	TeamID     int            `json:"TeamID"`
	PlayerName string         `json:"PlayerName"`
	EntryName  string         `json:"EntryName"`
	History    []fpl.Gameweek `json:"History"`
}

func main() {
	handleRequests()

	fmt.Println("Starting server at port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println(err)
	}
}

func initialiseData(leagueID int) error {
	league, err := fpl.GetLeague(leagueID)
	if err != nil {
		log.Println("Error: Failed to get league", err)
		return err
	}

	// set global state for league name
	leagueName = league.Name
	teamDetailsMapping = map[int]TeamDetails{}

	for _, manager := range league.Managers {
		history, err := fpl.GetGameweekHistoryByTeamID(manager.TeamID)
		if err != nil {
			log.Println("Error: Failed to get gameweek history", err)
			return err
		}

		teamDetails := TeamDetails{
			TeamID:     manager.TeamID,
			PlayerName: manager.PlayerName,
			EntryName:  manager.EntryName,
			History:    history,
		}

		// set global state for gameweek history for a team
		teamDetailsMapping[manager.TeamID] = teamDetails
	}

	return nil
}

func handleRequests() {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/standings", withLogging(standingsHandler))
}

// withLogging is a middleware that logs the duration of each request
func withLogging(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start).Milliseconds()
		log.Printf("%s %s took %d ms", r.Method, r.URL.Path, duration)
	}
}

// get standings

type StandingsResponse struct {
	LeagueName string        `json:"league_name"`
	Results    []TeamDetails `json:"results"`
}

func standingsHandler(w http.ResponseWriter, r *http.Request) {
	leagueIDStr := r.URL.Query().Get("leagueId")
	if leagueIDStr == "" {
		http.Error(w, "leagueId is required", http.StatusBadRequest)
		return
	}

	leagueID, err := strconv.Atoi(leagueIDStr)
	if err != nil {
		http.Error(w, "invalid leagueId", http.StatusBadRequest)
		return
	}

	err = initialiseData(leagueID)
	if err != nil {
		http.Error(w, "Failed to initialise data", http.StatusInternalServerError)
		return
	}

	var standings StandingsResponse
	standings.LeagueName = leagueName
	for _, teamDetails := range teamDetailsMapping {
		standings.Results = append(standings.Results, teamDetails)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(standings); err != nil {
		http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
		log.Println("Error: Failed to encode JSON", err)
		return
	}
}
