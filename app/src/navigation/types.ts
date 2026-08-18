export type LiveStackParamList = {
  GoLiveSetup: undefined;
  ConnectAccounts: undefined;
  LiveDashboard: { broadcastId: string };
  BroadcastSummary: { broadcastId: string };
};

export type LeadsStackParamList = {
  LeadList: undefined;
  ContactDetail: { contactId: string };
};

export type RootTabParamList = {
  Live: undefined;
  Leads: undefined;
  Tasks: undefined;
};
