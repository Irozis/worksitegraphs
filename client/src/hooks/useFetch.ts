import { useState, useEffect } from 'react';

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error(`Error fetching ${url}:`, err));
  }, [url]);
  return { data };
}

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
fetch(`${BASE}/api/stations`)

export default useFetch;