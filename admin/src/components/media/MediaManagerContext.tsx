import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  type MediaFileRow,
  type MediaFolderRow,
} from '@/lib/mediaModels';
import { loadAdminModuleState, saveAdminModuleState } from '@/lib/adminModuleStateApi';
import type { StorageGrowthPoint } from '@/lib/mediaModels';
import { deleteAdminMedia, fetchAdminMedia } from '@/lib/mediaUploadApi';

export type MediaSecuritySettings = {
  maxUploadMb: number;
  allowedExtensions: string;
  virusScanEnabled: boolean;
};

const defaultSecurity: MediaSecuritySettings = {
  maxUploadMb: 25,
  allowedExtensions: 'png, jpg, jpeg, webp, pdf',
  virusScanEnabled: true,
};

type MediaManagerValue = {
  files: MediaFileRow[];
  setFiles: Dispatch<SetStateAction<MediaFileRow[]>>;
  folders: MediaFolderRow[];
  setFolders: Dispatch<SetStateAction<MediaFolderRow[]>>;
  security: MediaSecuritySettings;
  setSecurity: Dispatch<SetStateAction<MediaSecuritySettings>>;
  storageTotalGb: number;
  storageUsedGb: number;
  fileCountApprox: number;
  growthSeries: StorageGrowthPoint[];
  deleteFile: (fileId: string) => void;
  replaceFileMeta: (fileId: string, patch: Partial<MediaFileRow>) => void;
};

const MediaManagerContext = createContext<MediaManagerValue | null>(null);

type MediaBackendState = {
  files: MediaFileRow[];
  folders: MediaFolderRow[];
  security: MediaSecuritySettings;
  storageTotalGb: number;
  storageUsedGb: number;
  fileCountApprox: number;
  growthSeries: StorageGrowthPoint[];
};

const EMPTY_MEDIA_STATE: MediaBackendState = {
  files: [],
  folders: [
    { folderId: 'root', folderName: 'media', parentId: null, module: 'media', fileCount: 0 },
    { folderId: 'uploads', folderName: 'uploads', parentId: 'root', module: 'media', fileCount: 0 },
  ],
  security: defaultSecurity,
  storageTotalGb: 0,
  storageUsedGb: 0,
  fileCountApprox: 0,
  growthSeries: [],
};

export function MediaManagerProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<MediaFileRow[]>([]);
  const [folders, setFolders] = useState<MediaFolderRow[]>([]);
  const [security, setSecurity] = useState<MediaSecuritySettings>(defaultSecurity);
  const [storageTotalGb, setStorageTotalGb] = useState(0);
  const [storageUsedGb, setStorageUsedGb] = useState(0);
  const [fileCountApprox, setFileCountApprox] = useState(0);
  const [growthSeries, setGrowthSeries] = useState<StorageGrowthPoint[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadAdminModuleState<MediaBackendState>('media', EMPTY_MEDIA_STATE),
      fetchAdminMedia(),
    ])
      .then(([state, mediaFiles]) => {
        if (!alive) return;
        setFiles(mediaFiles);
        setFolders(state.folders?.length ? state.folders : EMPTY_MEDIA_STATE.folders);
        setSecurity(state.security ?? defaultSecurity);
        setStorageTotalGb(state.storageTotalGb ?? 0);
        setStorageUsedGb(state.storageUsedGb ?? 0);
        setFileCountApprox(state.fileCountApprox ?? 0);
        setGrowthSeries(state.growthSeries ?? []);
        loadedRef.current = true;
      })
      .catch(() => {
        if (alive) loadedRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void saveAdminModuleState<MediaBackendState>('media', {
      files: [],
      folders,
      security,
      storageTotalGb,
      storageUsedGb,
      fileCountApprox,
      growthSeries,
    });
  }, [folders, security, storageTotalGb, storageUsedGb, fileCountApprox, growthSeries]);

  const deleteFile = (fileId: string) => {
    void deleteAdminMedia(fileId).then(() => {
      setFiles((list) => list.filter((f) => f.fileId !== fileId));
    });
  };

  const replaceFileMeta = (fileId: string, patch: Partial<MediaFileRow>) => {
    setFiles((list) => list.map((f) => (f.fileId === fileId ? { ...f, ...patch } : f)));
  };

  const value = useMemo(
    () => ({
      files,
      setFiles,
      folders,
      setFolders,
      security,
      setSecurity,
      storageTotalGb,
      storageUsedGb,
      fileCountApprox,
      growthSeries,
      deleteFile,
      replaceFileMeta,
    }),
    [files, folders, security, storageTotalGb, storageUsedGb, fileCountApprox, growthSeries],
  );

  return <MediaManagerContext.Provider value={value}>{children}</MediaManagerContext.Provider>;
}

export function useMediaManager(): MediaManagerValue {
  const c = useContext(MediaManagerContext);
  if (!c) throw new Error('useMediaManager must be used inside MediaManagerProvider');
  return c;
}
