export type LiveStackParamList = {
  GoLiveSetup: undefined;
  AddProperty: undefined;
  PropertyDetail: { propertyId: string };
  ConnectAccounts: undefined;
  LiveDashboard: { broadcastId: string };
  BroadcastSummary: { broadcastId: string };
};

export type ReportStackParamList = {
  ReportHome: undefined;
  ContactDetail: { contactId: string };
  BroadcastSummary: { broadcastId: string };
};

export type RootTabParamList = {
  Live: undefined;
  Report: undefined;
};
