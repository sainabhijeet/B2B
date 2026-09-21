import appDataSource from '../database/data-source';

export async function getWorkerDataSource() {
  if (!appDataSource.isInitialized) {
    await appDataSource.initialize();
  }
  return appDataSource;
}
