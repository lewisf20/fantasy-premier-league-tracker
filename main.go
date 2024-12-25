package main

import (
	"encoding/json"
	"fantasy-premier-league-tracker/fpl"
	"fmt"
	"log"
	"net/http"
	"time"
)

const (
	LeagueID = 979679

	BaseHistoryURL = "https://fantasy.premierleague.com/api/entry/%d/history/"

	// lewisTeamID  = 4243701
	// ryanTeamID   = 4160210
	// callumTeamID = 3585882
	// eliasTeamID  = 4992779
	// liamTeamID   = 5133175
	// jamieTeamID  = 5045999
	// dyTeamID     = 4638425
	// jakeTeamID   = 5205282
	// elliotTeamID = 6179028
	// joeTeamID    = 3274716
	// kaiTeamID    = 4912963
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
	err := initialiseData()
	if err != nil {
		log.Fatal("Error: Failed to initialise data", err)
		return
	}

	handleRequests()

	fmt.Println("Starting server at port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println(err)
	}
}

func initialiseData() error {
	league, err := fpl.GetLeague(LeagueID)
	if err != nil {
		log.Println("Error: Failed to get league", err)
		return err
	}

	// set global state for league name
	leagueName = league.Name

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
	Results []TeamDetails `json:"results"`
}

func standingsHandler(w http.ResponseWriter, r *http.Request) {
	var standings StandingsResponse

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
