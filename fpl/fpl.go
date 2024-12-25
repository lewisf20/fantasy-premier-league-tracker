package fpl

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

const (
	standingsUrl = "https://fantasy.premierleague.com/api/leagues-classic/%d/standings/"
	historyUrl   = "https://fantasy.premierleague.com/api/entry/%d/history/"
)

type League struct {
	Name     string
	Managers []Manager
}

type Manager struct {
	TeamID     int
	PlayerName string
	EntryName  string
}

func GetLeague(leagueID int) (League, error) {
	url := fmt.Sprintf(standingsUrl, leagueID)

	resp, err := http.Get(url)
	if err != nil {
		log.Println("Error: Failed to fetch standings", err)
		return League{}, err
	}
	defer resp.Body.Close()

	var standings standingsResponse
	if err := json.NewDecoder(resp.Body).Decode(&standings); err != nil {
		log.Println("Error: Failed to decode JSON", err)
		return League{}, err
	}

	league := League{
		Name: standings.League.Name,
	}

	for _, result := range standings.Standings.Results {
		manager := Manager{
			TeamID:     result.Entry,
			PlayerName: result.PlayerName,
			EntryName:  result.EntryName,
		}
		league.Managers = append(league.Managers, manager)
	}

	return league, nil
}

type Gameweek struct {
	Gameweek    int
	Points      int
	TotalPoints int
}

func GetGameweekHistoryByTeamID(teamID int) ([]Gameweek, error) {
	url := fmt.Sprintf(historyUrl, teamID)

	resp, err := http.Get(url)
	if err != nil {
		log.Println("Error: Failed to fetch history", err)
		return []Gameweek{}, err
	}
	defer resp.Body.Close()

	var history historyResponse
	if err := json.NewDecoder(resp.Body).Decode(&history); err != nil {
		log.Println("Error: Failed to decode JSON", err)
		return []Gameweek{}, err
	}

	var gameweekHistory []Gameweek
	for _, event := range history.Current {
		gameweek := Gameweek{
			Gameweek:    event.Event,
			Points:      event.Points,
			TotalPoints: event.TotalPoints,
		}
		gameweekHistory = append(gameweekHistory, gameweek)
	}

	return gameweekHistory, nil
}
