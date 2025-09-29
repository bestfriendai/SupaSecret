/**
 * FileSystem module
 *
 * This module exports the new SDK 54 FileSystem API and legacy methods.
 */

import { File, Directory, Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";

export { File, Directory, Paths };

export const getInfoAsync = LegacyFileSystem.getInfoAsync;
export const readAsStringAsync = LegacyFileSystem.readAsStringAsync;
export const writeAsStringAsync = LegacyFileSystem.writeAsStringAsync;
export const deleteAsync = LegacyFileSystem.deleteAsync;
export const downloadAsync = LegacyFileSystem.downloadAsync;
export const uploadAsync = LegacyFileSystem.uploadAsync;
export const makeDirectoryAsync = LegacyFileSystem.makeDirectoryAsync;
export const readDirectoryAsync = LegacyFileSystem.readDirectoryAsync;
export const copyAsync = LegacyFileSystem.copyAsync;
export const moveAsync = LegacyFileSystem.moveAsync;
export const getFreeDiskStorageAsync = LegacyFileSystem.getFreeDiskStorageAsync;
export const getTotalDiskCapacityAsync = LegacyFileSystem.getTotalDiskCapacityAsync;

export const cacheDirectory = Paths.cache.uri;
export const documentDirectory = Paths.document.uri;

export default {
  File,
  Directory,
  Paths,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  downloadAsync,
  uploadAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  copyAsync,
  moveAsync,
  getFreeDiskStorageAsync,
  getTotalDiskCapacityAsync,
  cacheDirectory,
  documentDirectory,
};
