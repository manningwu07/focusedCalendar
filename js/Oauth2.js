
// Event listeners:

document.getElementById('focus').addEventListener('click', focusEventListener);


/**
 * Sign in the user upon button click.
 */
async function focusEventListener() {
  const events = await getGoogleCalendar();
  const now = new Date();

  // Filter out past events
  let filteredEvents = events.filter(event => {
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    return eventEnd > now;
  });

  // Sort events chronologically
  filteredEvents.sort((a, b) => {
    const startTimeA = new Date(a.start.dateTime || a.start.date);
    const startTimeB = new Date(b.start.dateTime || b.start.date);
    return startTimeA - startTimeB;
  });

  // Find the current event
  let currentIndex = filteredEvents.findIndex(event => {
    const startTime = new Date(event.start.dateTime || event.start.date);
    return startTime > now;
  });

  // If no future events found, set currentIndex to 0
  if (currentIndex === -1) {
    currentIndex = 0;
  } else {

  }


  // Get only the 5 current/upcoming events
  try {
    filteredEvents = filteredEvents.slice(currentIndex - 1, currentIndex + 4);
  } catch {
    filteredEvents = filteredEvents.slice(currentIndex, currentIndex + 5);
  }

  // Call event functions when user opens page
  clearCurrentBlocksIfPastEndTime(filteredEvents);
  listEvents(filteredEvents);
  editButtonFocus();

}

function getGoogleCalendar() {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await new Promise((innerResolve, innerReject) => {
        chrome.identity.getAuthToken({ interactive: true }, token => {
          if (chrome.runtime.lastError) {
            innerReject(chrome.runtime.lastError);
          } else {
            innerResolve(token);
          }
        });
      });

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&key=redacted`, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      const eventData = await response.json();
      const events = eventData.items || [];
      resolve(events);
    } catch (error) {
      reject(error);
    }
  });
}

function listEvents(events) {
  if (!events || events.length === 0) {
    document.getElementById('calendar-focus').innerText = 'No upcoming events found for today.';
    return;
  }

  const calendarFocus = document.getElementById('calendar-focus');
  calendarFocus.innerHTML = ''; // Clear previous content

  events.forEach((event, index) => {
    const eventDiv = createEventDiv(event, index === 0);
    calendarFocus.appendChild(eventDiv);
  });

  // Display summary of the first event in another location
  const firstEventSummary = events[0].summary;
  document.getElementById('event-summary-focus').innerText = firstEventSummary;
}

const colorMap = {
  11: '#D50100',
  6: '#F4511E',
  2: '#33B679',
  1: '#7986CB',
  8: '#616161',
  4: '#E67C74',
  5: '#F6BF26',
  10: '#0A8043',
  9: '#3F51B5',
  3: '#8E24AA'
};

function createEventDiv(event, isCurrent) {
  const eventDiv = document.createElement('div');
  eventDiv.classList.add('event-focus');
  if (isCurrent) {
    eventDiv.classList.add('current-event-focus'); // Apply special effect for current event
  }
  const eventColor = colorMap[event.colorId] || '#039BE5'; // Use color map or default to peacock
  eventDiv.style.backgroundColor = eventColor;

  const summaryDiv = document.createElement('div');
  summaryDiv.textContent = event.summary;
  summaryDiv.classList.add('event-summary-focus');
  eventDiv.appendChild(summaryDiv);

  const timeDiv = document.createElement('div');
  const startTime = new Date(event.start.dateTime || event.start.date);
  const endTime = new Date(event.end.dateTime || event.end.date);
  timeDiv.textContent = `${formatTime(startTime)} - ${formatTime(endTime)}`;
  timeDiv.classList.add('event-time-focus');
  eventDiv.appendChild(timeDiv);

  return eventDiv;
}

function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}



// Function to block a website
async function blockWebsite() {
  const websiteInput = document.getElementById('search-bar-focus').value.trim();

  // Check if the input is a valid URL
  if (isValidDomainLink(websiteInput)) {
    // Get the current list of blocked websites from storage
    const options = await loadOptions();
    const { currentBlocks } = options;

    // Add the website to the currentBlocked if it's not already there
    if (!currentBlocks.includes("https://" + websiteInput + "/") && !currentBlocks.includes("https://www." + websiteInput + "/")) {
      currentBlocks.push("https://" + websiteInput + "/");
      currentBlocks.push("https://www." + websiteInput + "/");
      await saveOptions({ currentBlocks });
      alert('Website blocked successfully!');
    } else {
      alert('Website is already blocked!');
    }
  } else {
    alert('You must enter a domain name (Ex: google.com)');
    return;
  }

}

// Function to check if a string is a valid domain link
function isValidDomainLink(link) {
  const pattern = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-z]{2,}$/;
  return pattern.test(link) && !link.includes("www.");
}

async function editButtonFocus() {
  const lists = await loadOptions();
  const currentBlocks = lists.currentBlocks;
  const blockedWebsitesContainer = document.getElementById("blocked-websites-container");

  // Clear previous content
  blockedWebsitesContainer.innerHTML = "";

  // Populate the blocked websites
  currentBlocks.forEach((domain, index) => {
    if (index % 2 === 0) {
      const blockedWebsiteElement = createBlockedWebsiteElementFocus(domain);
      blockedWebsitesContainer.appendChild(blockedWebsiteElement);
    }
  });
}

function createBlockedWebsiteElementFocus(domain) {
  const blockedWebsiteElement = document.createElement("div");
  blockedWebsiteElement.classList.add("blocked-website");

  const domainElement = document.createElement("span");
  domainElement.classList.add("domain");
  domainElement.textContent = domain.split('/')[2];

  const trashIcon = document.createElement("i");
  trashIcon.classList.add("trash-icon", "fas", "fa-trash");
  trashIcon.addEventListener('click', () => removeWebsiteFromCurrentBlocksFocus(domain));

  blockedWebsiteElement.appendChild(domainElement);
  blockedWebsiteElement.appendChild(trashIcon);

  return blockedWebsiteElement;
}

async function removeWebsiteFromCurrentBlocksFocus(domain) {
  const lists = await loadOptions();
  let currentBlocks = lists.currentBlocks;

  // Remove the website from the currentBlocks
  const index = currentBlocks.indexOf(domain);
  if (index !== -1) {
    currentBlocks.splice(index, 2);
    await saveOptions({ currentBlocks });

    // Refresh the blocked websites list
    editButtonFocus();
  }
}


// Function to clear currentBlocks array if current time is past event end time
function clearCurrentBlocksIfPastEndTime(events) {
  const now = new Date();
  events.forEach(event => {
    const endTime = new Date(event.end.dateTime || event.end.date);
    if (now > endTime) {
      currentBlocks = [];
    }
  });
}