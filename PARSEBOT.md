ParseBot Prompt to create API Endpoints

I want to implement APIs for https://songbpm.com to Extract the first SongBPM track link from the search results page (the <a> element pointing to https://songbpm.com/@artist/track-slug-id) and use that canonical URL to load the track’s metadata page. From the SongBPM track page, extract the song’s BPM, musical key, time signature (beats per measure), and duration, and return all values as clean, structured fields.

SongBPM API — Minimal Usage Guide
1. fetch_search_results

POST https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/fetch_search_results

Purpose: Fetch SongBPM search HTML.
Body:

{
  "query": "artist or track name"
}


Returns:

{
  "html_content": "<html>...</html>"
}

2. extract_first_track_url

POST https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/extract_first_track_url

Purpose: Extract the first track’s canonical URL.
Body:

{
  "search_html": "<html>...</html>"
}


Returns:

{
  "track_url": "https://songbpm.com/@artist/track"
}

3. fetch_track_page

POST https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/fetch_track_page

Purpose: Fetch the HTML of a specific track page.
Body:

{
  "track_url": "https://songbpm.com/@artist/track"
}


Returns:

{
  "html_content": "<html>...</html>"
}

4. extract_track_metadata

POST https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/extract_track_metadata

Purpose: Extract BPM, key, duration, time signature.
Body:

{
  "track_html": "<html>...</html>"
}


Returns:

{
  "bpm": 120,
  "duration": "3:45",
  "musical_key": "C Major",
  "time_signature": "4/4"
}



SongBPM API — Extracted Code Snippets (JavaScript)
1. fetch_search_results
const url = 'https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/fetch_search_results';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-API-Key': 'YOUR_API_KEY'},
  body: JSON.stringify({
    query: "<Search term for an artist or track to look up on SongBPM.>"
  })
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}

2. extract_first_track_url
const url = 'https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/extract_first_track_url';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-API-Key': 'YOUR_API_KEY'},
  body: JSON.stringify({
    search_html: "<HTML content of the SongBPM search results page.>"
  })
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}

3. fetch_track_page
const url = 'https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/fetch_track_page';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-API-Key': 'YOUR_API_KEY'},
  body: JSON.stringify({
    track_url: "<Canonical URL of the SongBPM track page to fetch.>"
  })
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}

4. extract_track_metadata
const url = 'https://api.parse.bot/scraper/35797475-d872-4363-84cf-4aa5a960b588/extract_track_metadata';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-API-Key': 'YOUR_API_KEY'},
  body: JSON.stringify({
    track_html: "<HTML content of the SongBPM track metadata page.>"
  })
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
