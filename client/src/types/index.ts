export interface Station {
  id: number;
  name: string;
  hasAlert: boolean;
}

export interface ObjectItem {
  id: number;
  name: string;
  unit: string;
  location: string;
  description: string;
  createdAt: string;
  hasAlert: boolean;
  photoUrl?: string;
}