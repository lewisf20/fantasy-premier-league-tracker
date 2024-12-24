document.addEventListener("DOMContentLoaded", () => {
  const standingsTableBody = document.querySelector("#standingsTable tbody");
  const gameweekSelect = document.getElementById("gameweek");
  let teamNames = {}; // Store team names and manager names by team ID

  // Function to load standings and set up team names
  function loadStandings() {
    fetch("http://localhost:8080/standings")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch standings");
        }
        return response.json();
      })
      .then((data) => {
        const results = data.standings.results;

        // Clear the table before populating
        standingsTableBody.innerHTML = "";

        // Populate the table with default standings and save team names
        results.forEach((player) => {
          const { entry, player_name, entry_name, rank, total, event_total } =
            player;

          // Map `entry` to `team_id` for use in the `/history` endpoint
          teamNames[entry] = {
            teamName: entry_name,
            managerName: player_name,
          };

          // Populate the default standings table
          const row = document.createElement("tr");
          row.innerHTML = `
                            <td>${rank}</td>
                            <td>
                                <span class="team-name">${entry_name}</span><br>
                                <span class="manager-name">${player_name}</span>
                            </td>
                            <td>${event_total}</td>
                            <td>${total}</td>
                        `;
          standingsTableBody.appendChild(row);
        });
      })
      .catch((error) => {
        console.error("Error fetching standings:", error);
        standingsTableBody.innerHTML = `<tr><td colspan="4">Failed to load standings</td></tr>`;
      });
  }

  // Function to fetch the latest gameweek
  function fetchLatestGameweek() {
    return fetch("http://localhost:8080/latest_gameweek")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch latest gameweek");
        }
        return response.json();
      })
      .then((data) => {
        return data.latest_gameweek;
      })
      .catch((error) => {
        console.error("Error fetching latest gameweek:", error);
        return 1; // Fallback to gameweek 1 if there’s an error
      });
  }

  // Function to populate the dropdown
  function populateGameweekDropdown(latestGameweek) {
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
  function loadGameweekStandings(gameweek) {
    const previousRows = Array.from(standingsTableBody.children); // Store the previous rows

    fetch(`http://localhost:8080/history?gameweek=${gameweek}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch gameweek data");
        }
        return response.json();
      })
      .then((data) => {
        // Find the lowest points in the gameweek data
        const minPoints = Math.min(...data.map((team) => team.points));

        // Identify all teams with the lowest points
        const clownsOfTheWeek = data.filter(
          (team) => team.points === minPoints
        );

        // Create a mapping of previous ranks by team_id
        const previousRankMap = previousRows.reduce((map, row, index) => {
          const teamId = row.getAttribute("data-team-id");
          map[teamId] = index + 1;
          return map;
        }, {});

        // Clear the table before populating
        standingsTableBody.innerHTML = "";

        // Populate the table with gameweek data
        data.forEach((team) => {
          const { team_id, rank, points, total_points } = team;

          // Match `team_id` to entry ID in teamNames
          const teamData = teamNames[team_id];

          if (!teamData) {
            console.warn(`No team data found for team_id: ${team_id}`);
          }

          const { teamName = "Unknown Team", managerName = "Unknown Manager" } =
            teamData || {};

          // Calculate rank movement
          const previousRank = previousRankMap[team_id] || rank;
          const movement = previousRank - rank; // Positive for upward movement, negative for downward

          // Choose icon based on movement
          let movementHTML = `<span class="no-change-icon bi bi-dash-circle-fill" style="color: gray;"></span>`;
          if (movement > 0) {
            movementHTML = `<span class="rank-up-icon bi bi-arrow-up-circle-fill" style="color: green;"></span> ${movement}`;
          } else if (movement < 0) {
            movementHTML = `<span class="rank-down-icon bi bi-arrow-down-circle-fill" style="color: red;"></span> ${-movement}`;
          }

          // Determine if this row is one of the Clowns of the Week
          const isClown = clownsOfTheWeek.some(
            (clown) => clown.team_id === team_id
          );
          const clownHTML = isClown
            ? `<img src="./images/clown.png" alt="Clown of the Week" title="Clown of the Week" class="clown-icon">`
            : "";

          const row = document.createElement("tr");
          row.setAttribute("data-team-id", team_id);
          row.innerHTML = `
            <td>${rank} ${clownHTML}</td>
            <td>
                <span class="team-name">${teamName}</span><br>
                <span class="manager-name">${managerName}</span>
            </td>
            <td>${points}</td>
            <td>${total_points}</td>
            <td>${movementHTML}</td>
          `;
          standingsTableBody.appendChild(row);

          // Apply animation for rank changes
          if (movement !== 0) {
            row.classList.add(movement > 0 ? "rank-up" : "rank-down");
          }

          // Highlight the COTW row (Optional)
          if (isClown) {
            row.classList.add("clown-row");
          }
        });
      })
      .catch((error) => {
        console.error("Error fetching gameweek data:", error);
        standingsTableBody.innerHTML = `<tr><td colspan="5">Failed to load gameweek data</td></tr>`;
      });
  }

  // Event listener for dropdown selection
  gameweekSelect.addEventListener("change", () => {
    const selectedGameweek = gameweekSelect.value;
    if (selectedGameweek) {
      loadGameweekStandings(selectedGameweek);
    }
  });

  // Initial load of standings and setup
  fetchLatestGameweek().then((latestGameweek) => {
    populateGameweekDropdown(latestGameweek); // Populate dropdown first
    loadStandings(); // Load standings after dropdown setup
  });
});
