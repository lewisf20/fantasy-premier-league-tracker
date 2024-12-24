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
  let historyChart;
  let latestGameweek = 1; // Default to gameweek 1 if not fetched
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

        // Find the lowest points in the standings data
        const minPoints = Math.min(
          ...results.map((player) => player.event_total)
        );

        // Identify all teams with the lowest points
        const clownsOfTheWeek = results.filter(
          (player) => player.event_total === minPoints
        );

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

          // Determine if this row is one of the Clowns of the Week
          const isClown = clownsOfTheWeek.some(
            (clown) => clown.entry === entry
          );
          const clownHTML = isClown
            ? `<img src="./images/clown.png" alt="Clown of the Week" title="Clown of the Week" class="clown-icon">`
            : "";

          // Populate the default standings table
          const row = document.createElement("tr");
          row.setAttribute("data-team-id", entry);
          row.innerHTML = `
                                  <td>${rank} ${clownHTML}</td>
                                  <td>
                                      <span class="team-name">${entry_name}</span><br>
                                      <span class="manager-name">${player_name}</span>
                                  </td>
                                  <td>${event_total}</td>
                                  <td>${total}</td>
                              `;
          standingsTableBody.appendChild(row);

          // Add click event listener to show team history
          row.addEventListener("click", () => {
            showTeamHistory(entry);
          });
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
        latestGameweek = data.latest_gameweek;
        return latestGameweek;
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
    const previousGameweek = gameweek - 1;

    // Fetch previous gameweek standings if not the first gameweek
    const previousGameweekPromise =
      previousGameweek > 0
        ? fetch(
            `http://localhost:8080/history?gameweek=${previousGameweek}`
          ).then((response) => response.json())
        : Promise.resolve([]);

    previousGameweekPromise.then((previousData) => {
      const previousRankMap = previousData.reduce((map, team) => {
        map[team.team_id] = team.rank;
        return map;
      }, {});

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

            const {
              teamName = "Unknown Team",
              managerName = "Unknown Manager",
            } = teamData || {};

            // Calculate rank movement
            let movementHTML = `<span class="no-change-icon bi bi-dash-circle-fill" style="color: gray;"></span>`;
            if (gameweek > 1) {
              const previousRank = previousRankMap[team_id] || rank;
              const movement = previousRank - rank; // Positive for upward movement, negative for downward

              // Choose icon based on movement
              if (movement > 0) {
                movementHTML = `<span class="rank-up-icon bi bi-arrow-up-circle-fill" style="color: green;"></span> ${movement}`;
              } else if (movement < 0) {
                movementHTML = `<span class="rank-down-icon bi bi-arrow-down-circle-fill" style="color: red;"></span> ${-movement}`;
              }
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
            row.classList.remove("rank-up", "rank-down"); // Clear previous classes
            if (
              gameweek > 1 &&
              movementHTML !==
                `<span class="no-change-icon bi bi-dash-circle-fill" style="color: gray;"></span>`
            ) {
              row.classList.add(
                movementHTML.includes("rank-up") ? "rank-up" : "rank-down"
              );
            }

            // Highlight the COTW row (Optional)
            if (isClown) {
              row.classList.add("clown-row");
            }

            // Add click event listener to show team history
            row.addEventListener("click", () => {
              showTeamHistory(team_id);
            });
          });
        })
        .catch((error) => {
          console.error("Error fetching gameweek data:", error);
          standingsTableBody.innerHTML = `<tr><td colspan="5">Failed to load gameweek data</td></tr>`;
        });
    });
  }

  // Function to show team history in a modal
  function showTeamHistory(teamId) {
    fetch(`http://localhost:8080/team_history?team_id=${teamId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch team history");
        }
        return response.json();
      })
      .then((data) => {
        const labels = data.current.map((gw) => `GW ${gw.event}`);
        const points = data.current.map((gw) => gw.points);
        const totalPoints = data.current.map((gw) => gw.total_points);

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
                label: "Points",
                data: points,
                borderColor: "rgba(75, 192, 192, 1)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                fill: false,
              },
              {
                label: "Total Points",
                data: totalPoints,
                borderColor: "rgba(153, 102, 255, 1)",
                backgroundColor: "rgba(153, 102, 255, 0.2)",
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
                  text: "Points",
                },
              },
            },
          },
        });

        // Show the modal
        historyModal.style.display = "block";
      })
      .catch((error) => {
        console.error("Error fetching team history:", error);
      });
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

  // Initial load of standings and setup
  fetchLatestGameweek().then((latestGameweek) => {
    populateGameweekDropdown(latestGameweek); // Populate dropdown first
    loadStandings(); // Load standings after dropdown setup
  });
});
