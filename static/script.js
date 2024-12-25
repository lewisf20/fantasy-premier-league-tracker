// filepath: /C:/Users/lewis/Desktop/Projects - Coding/Fantasy Premier League Tracker/fantasy-premier-league-tracker/static/script.js
document.addEventListener("DOMContentLoaded", () => {
  const standingsTableBody = document.querySelector("#standingsTable tbody");
  const gameweekSelect = document.getElementById("gameweek");
  const prevGameweekButton = document.getElementById("prevGameweek");
  const nextGameweekButton = document.getElementById("nextGameweek");
  const historyModal = document.getElementById("historyModal");
  const closeModal = document.querySelector(".close");
  const historyChartCtx = document
    .getElementById("historyChart")
    .getContext("2d");
  const submitLeagueIdButton = document.getElementById("submitLeagueId");
  const leagueTitle = document.getElementById("leagueTitle");
  let historyChart;
  let latestGameweek = 1; // Default to gameweek 1 if not fetched

  /** @type {TeamDetails[]} */
  let teamDetails = []; // Store team details

  // Function to load standings and set up team names
  function loadStandings(leagueId) {
    fetch(`http://localhost:8080/standings?leagueId=${leagueId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch standings");
        }
        return response.json();
      })
      .then((data) => {
        teamDetails = data.results;

        // Set the league title
        leagueTitle.textContent = data.league_name;

        // Find the latest gameweek
        latestGameweek = Math.max(
          ...teamDetails.map((team) => team.History.length)
        );

        // Populate the dropdown with gameweeks
        populateGameweekDropdown(latestGameweek);

        // Load standings for the latest gameweek
        loadGameweekStandings(latestGameweek);
      })
      .catch((error) => {
        console.error("Error fetching standings:", error);
        standingsTableBody.innerHTML = `<tr><td colspan="4">Failed to load standings</td></tr>`;
      });
  }

  // Function to populate the dropdown
  function populateGameweekDropdown(latestGameweek) {
    gameweekSelect.innerHTML = ""; // Clear existing options
    for (let i = 1; i <= latestGameweek; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `Gameweek ${i}`;
      gameweekSelect.appendChild(option);
    }

    // Set the dropdown to the latest gameweek without triggering the change event
    gameweekSelect.value = latestGameweek;
  }

  // Function to fetch and display standings for the selected gameweek
  function calculateRanks(gameweek) {
    const sortedTeams = [...teamDetails].sort((a, b) => {
      return (
        b.History[gameweek - 1].TotalPoints -
        a.History[gameweek - 1].TotalPoints
      );
    });

    const ranks = {};
    sortedTeams.forEach((team, index) => {
      ranks[team.TeamID] = index + 1;
    });

    return ranks;
  }

  function loadGameweekStandings(gameweek) {
    const minPoints = Math.min(
      ...teamDetails.map((team) => team.History[gameweek - 1].Points)
    );

    const clownsOfTheWeek = teamDetails.filter(
      (team) => team.History[gameweek - 1].Points === minPoints
    );

    const currentRanks = calculateRanks(gameweek);
    const previousRanks = gameweek > 1 ? calculateRanks(gameweek - 1) : {};

    const sortedTeams = [...teamDetails].sort((a, b) => {
      return (
        b.History[gameweek - 1].TotalPoints -
        a.History[gameweek - 1].TotalPoints
      );
    });

    const previousPositions = {};
    const currentPositions = {};

    sortedTeams.forEach((team, index) => {
      previousPositions[team.TeamID] = previousRanks[team.TeamID] || index + 1;
      currentPositions[team.TeamID] = index + 1;
    });

    standingsTableBody.innerHTML = "";

    sortedTeams.forEach((team, index) => {
      const { TeamID, PlayerName, EntryName, History } = team;
      const gameweekData = History[gameweek - 1];

      const isClown = clownsOfTheWeek.some((clown) => clown.TeamID === TeamID);
      const clownHTML = isClown
        ? `<img src="./images/clown.png" alt="Clown of the Week" title="Clown of the Week" class="clown-icon">`
        : "";

      let rankMovement = 0;
      if (gameweek > 1) {
        rankMovement = previousRanks[TeamID] - currentRanks[TeamID];
      }

      const movementIcon =
        rankMovement > 0
          ? `<span class="movement up">▲ ${rankMovement}</span>`
          : rankMovement < 0
          ? `<span class="movement down">▼ ${Math.abs(rankMovement)}</span>`
          : `<span class="movement">-</span>`;

      const row = document.createElement("tr");
      row.setAttribute("data-team-id", TeamID);
      row.innerHTML = `
              <td>${index + 1} ${clownHTML}</td>
              <td>
                  <span class="team-name">${EntryName}</span><br>
                  <span class="manager-name">${PlayerName}</span>
              </td>
              <td>${gameweekData.Points}</td>
              <td>${gameweekData.TotalPoints}</td>
              <td>${movementIcon}</td>
          `;

      const initialPosition = previousPositions[TeamID] - 1;
      const finalPosition = currentPositions[TeamID] - 1;

      if (initialPosition !== finalPosition) {
        row.style.transition = "transform 2s ease-out";
        row.style.transform = `translateY(${
          (initialPosition - finalPosition) * 100
        }%)`;

        requestAnimationFrame(() => {
          row.style.transform = "translateY(0)";
        });

        if (rankMovement > 0) {
          row.classList.add("glow-green");
        } else if (rankMovement < 0) {
          row.classList.add("glow-red");
        }

        // Remove the glow class after the animation ends
        setTimeout(() => {
          row.classList.remove("glow-green");
          row.classList.remove("glow-red");
        }, 1000);
      }

      standingsTableBody.appendChild(row);

      row.addEventListener("click", () => {
        showTeamHistory(TeamID, teamDetails.length);
      });
    });
  }

  // Function to show team history in a modal
  function showTeamHistory(teamId, totalTeams) {
    const team = teamDetails.find((team) => team.TeamID === teamId);
    if (!team) {
      console.error("Team not found");
      return;
    }

    const labels = team.History.map((gw) => `GW ${gw.Gameweek}`);
    const ranks = team.History.map((gw, index) => {
      // Calculate rank for each gameweek
      const sortedTeams = [...teamDetails].sort((a, b) => {
        return b.History[index].TotalPoints - a.History[index].TotalPoints;
      });
      return sortedTeams.findIndex((t) => t.TeamID === teamId) + 1;
    });

    // Destroy previous chart instance if it exists
    if (historyChart) {
      historyChart.destroy();
    }

    // Create a new chart
    historyChart = new Chart(historyChartCtx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Rank",
            data: ranks,
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: "Gameweek",
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: "Rank",
            },
            reverse: true, // Reverse the y-axis to show rank 1 at the top
            suggestedMin: 1, // Set the minimum rank to 1
            max: totalTeams, // Set the maximum rank to total number of teams
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });

    // Show the modal
    historyModal.style.display = "block";
  }

  // Event listener to close the modal
  closeModal.addEventListener("click", () => {
    historyModal.style.display = "none";
  });

  // Event listener to close the modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === historyModal) {
      historyModal.style.display = "none";
    }
  });

  // Event listener for dropdown selection
  gameweekSelect.addEventListener("change", () => {
    const selectedGameweek = gameweekSelect.value;
    if (selectedGameweek) {
      loadGameweekStandings(selectedGameweek);
    }
  });

  // Event listeners for next and previous buttons
  prevGameweekButton.addEventListener("click", () => {
    let currentGameweek = parseInt(gameweekSelect.value, 10);
    if (currentGameweek > 1) {
      currentGameweek -= 1;
      gameweekSelect.value = currentGameweek;
      loadGameweekStandings(currentGameweek);
    }
  });

  nextGameweekButton.addEventListener("click", () => {
    let currentGameweek = parseInt(gameweekSelect.value, 10);
    if (currentGameweek < latestGameweek) {
      currentGameweek += 1;
      gameweekSelect.value = currentGameweek;
      loadGameweekStandings(currentGameweek);
    }
  });

  // Event listener for form submission
  submitLeagueIdButton.addEventListener("click", () => {
    const leagueId = document.getElementById("leagueId").value;
    if (leagueId) {
      loadStandings(leagueId);
    }
  });
});
