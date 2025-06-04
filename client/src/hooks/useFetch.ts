import { useState, useEffect } from 'react';

// Update the url parameter type to allow for falsy values
function useFetch<T>(url: string | null | undefined) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    // If the URL is not provided (null, undefined, or empty string),
    // reset data and do not attempt to fetch.
    if (!url) {
      setData(null);
      return;
    }

    // Existing fetch logic with improved error handling
    fetch(url)
      .then(res => {
        if (!res.ok) {
          // Throw an error for non-2xx responses to be caught by the .catch block
          throw new Error(`HTTP error! status: ${res.status}, url: ${url}`);
        }
        return res.json();
      })
      .then(jsonData => setData(jsonData as T)) // Assuming jsonData is of type T
      .catch(err => {
        console.error(`Error fetching ${url}:`, err);
        setData(null); // Reset data on any fetch error
      });
  }, [url]); // Effect re-runs if the url changes

  return { data };
}

// Removed extraneous fetch call and BASE constant

export default useFetch;