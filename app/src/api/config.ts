// Central place to flip from mock data to the real Lifesycle API once
// endpoint/schema details are supplied. Every function in src/api/*.ts
// checks USE_MOCKS and only imports mock data when true, so removing this
// flag later is a small, isolated change.

export const API_BASE_URL = process.env.EXPO_PUBLIC_LIFESYCLE_API_URL ?? "";

// Defaults to mocked data until a real API_BASE_URL is configured, so the
// app is runnable/demoable before backend integration lands.
export const USE_MOCKS = API_BASE_URL.length === 0;
