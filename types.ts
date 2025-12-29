
export interface AttendanceRecord {
  id: string;
  registerNumber: string;
  date: string;
  time: string;
  networkSsid: string;
  status: 'Verified' | 'Pending';
}

export interface NetworkState {
  isConnected: boolean;
  ssid: string;
  strength: number;
}
