/** @typedef {import("./common")} */





// Block JS Functions


// HTML + CSS Functions
document.getElementById('block').addEventListener('click', function () {
  // Get reference to the "container" div
  const containerDiv = document.querySelector('.container');
  containerDiv.innerHTML = "";
  containerDiv.style = "";

  // Replace the content of the "container" div
  containerDiv.innerHTML = `
  <div id="block-button" class="button">Block this site</div>
  <div id="edit-button" class="button">Edit blocklist</div>
  <div id="post"></div>`;

  // Add listeners and content
  document.getElementById("block-button").addEventListener('click', blockButton);
  document.getElementById("edit-button").addEventListener('click', editButton);
  loadFlex();

  document.documentElement.style.height = "240px"
});

// Actual Functions
// Block website functions:
document.getElementById("block-button").addEventListener('click', blockButton);

async function blockButton() {
  const lists = await loadOptions();
  let blacklist = lists.blacklist;

  const websiteURL = simplifyUrl(await getLastUsedTabUrl());
  if (blacklist.includes(websiteURL)) { document.getElementById('post').textContent = `You have already blocked "${websiteURL}"!`; }
  else if (websiteURL === null || websiteURL === "//undefined/") { document.getElementById('post').textContent = `Switch tabs back and forth to block website!`; }
  else {
    document.getElementById('post').textContent = `Added the website ${websiteURL} to your blocklist!`;
    saveToBlackList(websiteURL);
  }
};

// Get url
async function getLastUsedTabUrl() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "getLastUsedTabUrl" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.url);
      }
    });
  });
}

// Get website base link
function simplifyUrl(url) {
  // Split the URL at the first occurrence of "/"
  const parts = url.split('/');
  const protocol = parts[0]; // Get the https: or http: part
  const domain = parts[2]; // Get the domain part
  const baseUrl = protocol + "//" + domain + "/"
  return baseUrl;
}

// Saves url to blacklist
async function saveToBlackList(url) {
  const lists = await loadOptions();
  let blacklist = lists.blacklist;
  if (!blacklist.includes(url)) {
    blacklist.push(url);
    // Save blacklist options
    await saveOptions({
      blacklist: blacklist
    })
    await new Promise(resolve => setTimeout(resolve, 200))
  } // Otherwise, dont save because useless
}


// Edit blacklist functions:  
// Main function
document.getElementById("edit-button").addEventListener('click', editButton);

async function editButton() {
  const lists = await loadOptions();
  const blacklist = lists.blacklist;
  const blockedWebsitesContainer = document.getElementById("post");
  console.log(lists);
  console.log(blacklist);
  // Clear previous content
  blockedWebsitesContainer.innerHTML = "";

  // Create search input field
  const searchInput = document.createElement("input");
  searchInput.setAttribute("type", "text");
  searchInput.setAttribute("placeholder", "Search blocked websites");
  searchInput.addEventListener('input', () => filterBlockedWebsites(blacklist, blockedWebsitesContainer, searchInput.value));
  blockedWebsitesContainer.appendChild(searchInput);

  // Populate the blocked websites
  blacklist.forEach(domain => {
    const blockedWebsiteElement = document.createElement("div");
    blockedWebsiteElement.classList.add("blocked-website");

    const domainElement = document.createElement("span");
    domainElement.classList.add("domain");
    domainElement.textContent = domain;

    const trashIcon = document.createElement("i");
    trashIcon.classList.add("trash-icon", "fas", "fa-trash");
    trashIcon.addEventListener('click', () => removeWebsiteFromBlacklist(domain));

    blockedWebsiteElement.appendChild(domainElement);
    blockedWebsiteElement.appendChild(trashIcon);

    blockedWebsitesContainer.appendChild(blockedWebsiteElement);
  });
};


async function filterBlockedWebsites(blacklist, container, searchQuery) {
  // Clear previous content except for the search input field
  while (container.childElementCount > 1) {
    container.removeChild(container.lastElementChild);
  }

  // Filter the blacklist based on the search query
  const filteredBlacklist = blacklist.filter(domain => domain.includes(searchQuery));

  // Populate the filtered blocked websites
  filteredBlacklist.forEach(domain => {
    const blockedWebsiteElement = document.createElement("div");
    blockedWebsiteElement.classList.add("blocked-website");

    const domainElement = document.createElement("span");
    domainElement.classList.add("domain");
    domainElement.textContent = domain;

    const trashIcon = document.createElement("i");
    trashIcon.classList.add("trash-icon", "fas", "fa-trash");
    trashIcon.addEventListener('click', () => removeWebsiteFromBlacklist(domain));

    blockedWebsiteElement.appendChild(domainElement);
    blockedWebsiteElement.appendChild(trashIcon);

    container.appendChild(blockedWebsiteElement);
  });
}

async function removeWebsiteFromBlacklist(domain) {
  const lists = await loadOptions();
  let blacklist = lists.blacklist;

  // Remove the website from the blacklist
  const index = blacklist.indexOf(domain);
  if (index !== -1) {
    blacklist.splice(index, 1);
    await saveOptions({ blacklist });

    // Refresh the blocked websites list
    document.getElementById("edit-button").click();
  }
}


// Load flex div
const loadFlex = async function () {
  const lists = await loadOptions();
  const blacklist = lists.blacklist;

  const websiteURL = simplifyUrl(await getLastUsedTabUrl());
  const domain = websiteURL.split('/')[2];
  if (domain !== "undefined" && !blacklist.includes(websiteURL)) { document.getElementById('post').textContent = `Block "${domain}"?`; }
  else if (blacklist.includes(websiteURL)) { document.getElementById('post').textContent = `You have already blocked "${domain}"!`; }
  else { document.getElementById('post').textContent = `Swap websites to get the website`; }
}

document.addEventListener('DOMContentLoaded', loadFlex);







// Focus functions

// HTML + CSS Functions
// Add event listener to the "focus" div
document.getElementById('focus').addEventListener('click', function () {
  // Get reference to the "container" div
  const containerDiv = document.querySelector('.container');
  containerDiv.innerHTML = "";

  // Replace the content of the "container" div
  containerDiv.innerHTML = `
        <div class="left-side-focus">
          <div id="google-schedule-focus">
            <div class="title-focus">Your calendar:</div>
            <div id="calendar-focus"></div>
          </div>
      </div>
      
        </div>
        <div class="right-side-focus">  
            <div id="current-event-focus">
                <div class="title-focus">Your current event is:</div>
                <div id = "event-summary-focus"></div>
            </div>

            <div id="restricted-tabs-focus">
              <label for="ai-tab-switch">AI Tab Restriction:</label>
              <div class="switch">
                <input type="checkbox" id="ai-tab-switch">
                <label for="ai-tab-switch"></label>
              </div>
            <button class="help-button">?</button>
            <div id="search-bar-container">
              <input type="text" id="search-bar-focus" placeholder="Manually input websites">
              <button id="block-website-button-focus">Block</button>
            </div>
          <div id="blocked-websites-container"></div>
        </div>
        </div>`;
  containerDiv.style = "";
  containerDiv.style.display = "flex";
  containerDiv.style.height = "275px";

  document.documentElement.style.height = "332px";

  return new Promise(async (resolve) => {
    let options = await loadOptions();
    const switchElement = document.querySelector('.switch');
    if (options.aiOn) {
      switchElement.classList.add('switch-on');
    }
    // Event listener for blocking websites
    document.getElementById('block-website-button-focus').addEventListener('click', blockWebsite);
    document.getElementById("ai-tab-switch").addEventListener("change", handleCheckboxChange);

    resolve();
  });
});


  const handleCheckboxChange = async () => {
    const checkbox = document.getElementById("ai-tab-switch");
    let options = await loadOptions();
    options.aiOn = checkbox.checked;
    // Get reference to the switch element
    const switchElement = document.querySelector('.switch');

    // Add or remove the "switch-on" class based on the value of aiOn
    if (options.aiOn) {
      switchElement.classList.add('switch-on');
    } else {
      switchElement.classList.remove('switch-on');
    }

    await saveOptions(options);
  }