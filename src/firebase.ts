import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYp_J6RPY49RCfoI4H88DG2NBgIGR3e0A",
  authDomain: "punkkigame.firebaseapp.com",
  databaseURL: "https://punkkigame-default-rtdb.firebaseio.com",
  projectId: "punkkigame",
  storageBucket: "punkkigame.firebasestorage.app",
  messagingSenderId: "308792827770",
  appId: "1:308792827770:web:bf8892d9a1a89ddda8c0c3",
  measurementId: "G-CP84HGM4B1"
};

// Initialize Firebase App and export Firestore database instance
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
