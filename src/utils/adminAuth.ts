// Admin UIDs — add your Firebase Auth UID here.
// Find it on the Settings page or in the Firebase console under Authentication.
const ADMIN_UIDS: string[] = ["RmUxDDMK7LevCheByFvsUqxTisH2"];

export function isAdmin(uid: string): boolean {
  return ADMIN_UIDS.includes(uid);
}
