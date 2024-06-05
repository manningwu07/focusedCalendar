// global variables
let lastUsedTabUrl = null;


chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  lastUsedTabUrl = tabs[0].url;
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    lastUsedTabUrl = tab.url;
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "getLastUsedTabUrl") {
    sendResponse({ url: lastUsedTabUrl });
  }
});

function getCurrentTabUrl(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const url = tabs[0].url;
    callback(url);
  });
}


// MAIN EVENT TRIGGER
let lastDomain = '';
let text = "";
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    let url = changeInfo.url;
    if (url) {
      const parts = url.split('/');
      const domain = parts[2]; // Get the domain part

      if (domain !== lastDomain) {
        lastDomain = domain;

        const protocol = parts[0]; // Get the https: or http: part
        const baseUrl = protocol + "//" + domain + "/";

        isUrlBlocked(baseUrl).then((blocked) => {
          if (blocked) {
            chrome.tabs.update(tabId, { url: "blocked.html" });
          }
        });

        // Pass the text and URL to AITabBlocker
        chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
          text = await handleMessage(message);
        });
        setTimeout(function () {
          getCurrentTabUrl(function (currentUrl) {
            AITabBlocker(text, currentUrl);
          });
        }, 2000);

      }
    }
  } catch (error) {
    console.error(error);
  }
});


// Function to check if a domain is blocked
async function isUrlBlocked(url) {
  const lists = await getOptions();
  const blacklist = lists.blacklist;
  const currentBlocks = lists.currentBlocks;
  return blacklist.includes(url) || currentBlocks.includes(url);
}


// Insights functions

let timeTracker = {
  websiteName: [],
  websiteTime: [],
  categoryName: [],
  categoryTime: [],
  lastSwitchTime: 0
};


function handleTabActivation() {
  if (lastDomain) {
    if (!timeTracker.websiteName.includes(lastDomain)) {
      timeTracker.websiteName.push(lastDomain);
    }
    update(lastDomain);
  }
}


function update(domain) {
  const currentTime = new Date();
  const totalSeconds = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
  const totalTime = timeTracker.lastSwitchTime === 0 ? 0 : totalSeconds - timeTracker.lastSwitchTime;
  const lastIndex = timeTracker.websiteName.lastIndexOf(domain);

  if (lastIndex !== -1) {
    const lastDomainTime = timeTracker.websiteTime[lastIndex];
    timeTracker.websiteTime[lastIndex] = lastDomainTime + (totalTime);
  } else {
    timeTracker.websiteName.push(domain);
    timeTracker.websiteTime.push(totalTime);
    timeTracker.categoryName.push(categorizeWebsite(domain));
  }

  updateCategoryTime(domain, totalTime);
  timeTracker.lastSwitchTime = totalSeconds;
}

async function categorizeWebsite(domain) {
  // Basically, tell AI to determine out of 5 categories the domain name what it is:
  const instructions = `Categorize this domain: ${domain}. Only state one of the following: "learning and research"-Websites that give information (khan academy, news, medium, etc.), "entertainment"-video game apps, streaming services (netflix, hulu, twitch), music (spotify, etc.), p*rn apps. "social media" - social media, dating apps, messaging systems, etc. "work"-anything that isn't entertainment or socials, and used clearly for professional services. "Miscillanious"-Fits 2+ sections (youtube, podcasts, etc.) or its impossible based off domain name alone`;
  const apiKey = "redacted";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        {
          "role": "user",
          "content": instructions,
        }
      ],
      temperature: 0,
      max_tokens: 5
    })
  });
  let output = "";
  try {
    output = response.choices[0].message.content.trim();
  } catch {
    output = "miscullanous";
  }
  resolve(output);
}

function updateCategoryTime(domain, totalTime) {
  // For time: Same thing as updateWebsiteTime, but times are fixed, so it will be 5 indexes and we use categorizeWebsite to determine where time goes
  const category = categorizeWebsite(domain);
  if (category.toLowerCase() === "work") { // Basically anything that isn't entertainment, socials, etc.
    timeTracker.categoryTime[0] = totalTime;
  } else if (category.toLowerCase() === "learning and research") { // Websites that give information: Khan academy, News, medium, etc.
    timeTracker.categoryTime[1] = totalTime;
  } else if (category.toLowerCase() === "entertainment") { // video games, streaming services (netflix, hulu, twitch), music, etc.
    timeTracker.categoryTime[2] = totalTime;
  } else if (category.toLowerCase() === "socials") { // social media, dating apps, messaging apps, etc. 
    timeTracker.categoryTime[3] = totalTime;
  } else { // Miscellanous (extreme situation - dont want to get this if ever) This will probably happen for things like youtube, podcasts, etc. that fit multiple categories and its impossible based off domain name alone
    timeTracker.categoryTime[4] = totalTime;
  }
}

// Function to reset timeTracker at midnight every day
async function resetTimeTracker() {
  const currentTime = new Date();
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();

  // Check if it's midnight (00:00:00)
  if (hours === 0 && minutes === 0 && seconds === 0) {
    // Reset timeTracker object to empty lists
    timeTracker = {
      websiteName: [],
      websiteTime: [],
      categoryName: [],
      categoryTime: [],
      lastSwitchTime: 0
    };

    await setOptions({ timeTracker });
  }
}

// Run the resetTimeTracker function every minute to check for midnight
setInterval(resetTimeTracker, 60000);



// AI Tab blocker

async function handleMessage(message) {
  if (message && message.content) {
    return message.content;
  }
}

let lastExecutionTime = 0;
const cooldownDuration = 3000;

async function AITabBlocker(text, url) {
  let aiOn = false;
  const currentTime = Date.now();
  if (currentTime - lastExecutionTime >= cooldownDuration) {
    checkAIOn().then(async result => {
      aiOn = result;
      if (url !== undefined && url !== null) {
        if (url.includes("http") && aiOn) {
          const results = await AIResults(url, text);
          response(results);
        }
      }
    });

    lastExecutionTime = currentTime;
  }
}


function checkAIOn() {
  return new Promise(async (resolve) => {
    const lists = await getOptions();
    const events = await getGoogleCalendar();
    resolve(events && lists.aiOn);
  })
}


// Step 2: Fetch OpenAI resource so that you can parse information and get response

function getThemes() {
  return new Promise((resolve) => {
    getGoogleCalendar().then(async currentEvent => {
      const apiKey = "reacted";
      const title = currentEvent.summary || "All websites will be relevant";
      const description = currentEvent.description || "";
      const instructions = `Overarching themes and context with respect to website relevance surrounding this: ${title}? Description for better context: ${description}. \n\n Say 'The themes of this event are...' (make it a one sentence description)`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo-0125',
          messages: [
            {
              "role": "user",
              "content": instructions,
            }
          ],
          temperature: 0,
          max_tokens: 45
        })
      });

      const data = await response.json();
      let themes = ""
      try {
        themes = data.choices[0].message.content.trim()
      } catch (error) {
        themes = "";
      }
      const information = [title, description, themes];
      resolve(information);

    })
  });
}

function AIResults(websiteURL, websiteInfo) {
  return new Promise(async (resolve) => {
    const apiKey = "redacted";
    const eventData = await getThemes();
    if (eventData) {
      const information = `Website URL to the above data: ${websiteURL}. \n Event title is: ${eventData[0]}. \n Event description is: ${eventData[1]}. ${eventData[2]} `
      const instructions = `This is with regards to whether that website is helping the user complete the event or being a distraction. If this website a domain, respond with 'relevant'. The definition for relevent in this context is if the website is directly related towards the event, with maybe a simple jump such as academics --> education, but no more than that jump. The website info should override the websiteURL reputation. For example, Reddit is usually considered a distraction, but if the user is looking in Reddit related to a question about the event, say 'relevant' rather than 'not relevant'. However, if there is no content from the data given above, then use the websiteURL information to determine worth blocking or not - after domain name should have information on general website trends on what the purpose of the website is for. Analyze if its a distraction or not. First ask yourself what percentage of relevence this website would have? If you believe the website has a 65%+ relevance, respond with 'relevant'. If you believe the website is not relevant (50%> relevance or 70%+ distraction), respond with 'not relevant'. If you are not sure (50%-65% relevance), respond with 'not sure'. YOU STATE ONE OF THE 3 QUOTED RESPONSES ONLY THIS IS NON-NEGOTIABLE!`
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo-0125',
          messages: [
            {
              "role": "user",
              "content": websiteInfo + '\n\n' + information + '\n\n' + instructions,
            }
          ],
          temperature: 0,
          max_tokens: 4
        })
      });

      const data = await response.json();
      let output = ""
      try {
        output = data.choices[0].message.content.trim();
      } catch (error) {
        output = "relevent";
      }
      resolve(output);
    }

  });
}




// Respond to the user by blocking tab, no blocking tab, or asking the user if this tab is nessecary to the event (basically a warning sign)
function response(AIResponse) {
  if (AIResponse.toLowerCase().includes("not relevent")) {
    chrome.tabs.update(tabId, { url: "blocked.html" });
  } else if (AIResponse.toLowerCase().includes("not sure")) {
    alert("This tab may not be relevent to the event you wish to do. If you wish to proceed, click ok. Otherwise, you shouhld exit out of this tab");
  }
}





// Functions I cant access because background.js is seperate from rest of code


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

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&key=reacted`, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      const eventData = await response.json();
      const events = eventData.items || [];

      // Filter out past events and sort chronologically
      let filteredEvents = events
        .filter(event => new Date(event.end.dateTime || event.end.date) > now)
        .sort((a, b) => {
          const startTimeA = new Date(a.start.dateTime || a.start.date);
          const startTimeB = new Date(b.start.dateTime || b.start.date);
          return startTimeA - startTimeB;
        });

      const currentEvent = filteredEvents[0];
      resolve(currentEvent);
    } catch (error) {
      reject(error);
    }
  });
}

async function getOptions() {
  const options = await new Promise((resolve) => {
    chrome.storage.sync.get({
      blacklist: [],
      currentBlocks: [],
      aiOn: false,
      timeTrack: {
        websiteName: [],
        websiteTime: [],
        categoryName: [],
        categoryTime: [],
        lastSwitchTime: 0
      }
    }, resolve);
  });
  return options;
}

const setOptions = async (options) => new Promise((resolve) => {
  chrome.storage.sync.set(options, resolve);
})
