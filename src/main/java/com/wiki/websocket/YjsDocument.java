package com.wiki.websocket;

import java.util.*;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Y.js 문서 상태를 관리하는 클래스
 * CRDT(Conflict-free Replicated Data Types) 기반 자동 충돌 해결 지원
 */
public class YjsDocument {
    private final String documentName;
    private final List<byte[]> updates;
    private final ReadWriteLock lock;
    private byte[] stateVector;
    private long lastModified;
    private final AtomicLong version;
    private final Map<String, Object> metadata;
    
    // 문서 스냅샷 (주기적으로 업데이트)
    private byte[] snapshot;
    private int snapshotVersion;
    private static final int SNAPSHOT_INTERVAL = 100; // 100개의 업데이트마다 스냅샷 생성
    
    public YjsDocument(String documentName) {
        this.documentName = documentName;
        this.updates = new ArrayList<>();
        this.lock = new ReentrantReadWriteLock();
        this.stateVector = new byte[0];
        this.lastModified = System.currentTimeMillis();
        this.version = new AtomicLong(0);
        this.metadata = new HashMap<>();
        this.snapshot = null;
        this.snapshotVersion = 0;
    }
    
    /**
     * 업데이트 추가 및 충돌 해결
     * Y.js의 CRDT 특성상 업데이트는 항상 충돌 없이 병합됨
     */
    public void addUpdate(byte[] update) {
        lock.writeLock().lock();
        try {
            updates.add(update);
            lastModified = System.currentTimeMillis();
            long currentVersion = version.incrementAndGet();
            
            // 주기적으로 스냅샷 생성
            if (currentVersion % SNAPSHOT_INTERVAL == 0) {
                createSnapshot();
            }
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    /**
     * 모든 업데이트 가져오기
     */
    public List<byte[]> getAllUpdates() {
        lock.readLock().lock();
        try {
            return new ArrayList<>(updates);
        } finally {
            lock.readLock().unlock();
        }
    }
    
    /**
     * 특정 버전 이후의 업데이트 가져오기
     */
    public List<byte[]> getUpdatesSince(long sinceVersion) {
        lock.readLock().lock();
        try {
            if (sinceVersion >= updates.size()) {
                return new ArrayList<>();
            }
            
            // 스냅샷이 있고 요청된 버전이 스냅샷 버전보다 크면
            // 스냅샷부터 시작
            if (snapshot != null && sinceVersion >= snapshotVersion) {
                List<byte[]> result = new ArrayList<>();
                // 스냅샷 추가
                result.add(snapshot);
                // 스냅샷 이후의 업데이트 추가
                int startIndex = Math.max(snapshotVersion, (int)sinceVersion);
                result.addAll(updates.subList(startIndex, updates.size()));
                return result;
            }
            
            return new ArrayList<>(updates.subList((int)sinceVersion, updates.size()));
        } finally {
            lock.readLock().unlock();
        }
    }
    
    /**
     * 스냅샷 생성
     * 모든 업데이트를 하나의 상태로 병합
     */
    private void createSnapshot() {
        // 실제 Y.js에서는 Y.encodeStateAsUpdate를 사용하여 스냅샷 생성
        // 여기서는 간단히 모든 업데이트를 연결
        ByteBuffer buffer = ByteBuffer.allocate(calculateTotalSize());
        for (byte[] update : updates) {
            buffer.put(update);
        }
        snapshot = buffer.array();
        snapshotVersion = updates.size();
    }
    
    private int calculateTotalSize() {
        int size = 0;
        for (byte[] update : updates) {
            size += update.length;
        }
        return size;
    }
    
    /**
     * 상태 벡터 업데이트
     * 클라이언트의 현재 동기화 상태를 나타냄
     */
    public void updateStateVector(byte[] newStateVector) {
        lock.writeLock().lock();
        try {
            this.stateVector = newStateVector;
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    /**
     * 상태 벡터 가져오기
     */
    public byte[] getStateVector() {
        lock.readLock().lock();
        try {
            return Arrays.copyOf(stateVector, stateVector.length);
        } finally {
            lock.readLock().unlock();
        }
    }
    
    /**
     * 문서가 수정되었는지 확인
     */
    public boolean isDirty() {
        return !updates.isEmpty();
    }
    
    /**
     * 마지막 수정 시간
     */
    public long getLastModified() {
        return lastModified;
    }
    
    /**
     * 문서 이름
     */
    public String getDocumentName() {
        return documentName;
    }
    
    /**
     * 현재 버전
     */
    public long getVersion() {
        return version.get();
    }
    
    /**
     * 메타데이터 설정
     */
    public void setMetadata(String key, Object value) {
        lock.writeLock().lock();
        try {
            metadata.put(key, value);
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    /**
     * 메타데이터 가져오기
     */
    public Object getMetadata(String key) {
        lock.readLock().lock();
        try {
            return metadata.get(key);
        } finally {
            lock.readLock().unlock();
        }
    }
    
    /**
     * 문서 상태 요약 정보
     */
    public Map<String, Object> getDocumentInfo() {
        lock.readLock().lock();
        try {
            Map<String, Object> info = new HashMap<>();
            info.put("name", documentName);
            info.put("version", version.get());
            info.put("updates", updates.size());
            info.put("lastModified", lastModified);
            info.put("hasSnapshot", snapshot != null);
            info.put("snapshotVersion", snapshotVersion);
            info.put("metadata", new HashMap<>(metadata));
            return info;
        } finally {
            lock.readLock().unlock();
        }
    }
    
    /**
     * 문서 초기화 (주의: 모든 업데이트 삭제)
     */
    public void reset() {
        lock.writeLock().lock();
        try {
            updates.clear();
            stateVector = new byte[0];
            lastModified = System.currentTimeMillis();
            version.set(0);
            metadata.clear();
            snapshot = null;
            snapshotVersion = 0;
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    /**
     * 업데이트 압축 (중복 제거 및 최적화)
     * 주기적으로 호출하여 메모리 사용량 감소
     */
    public void compactUpdates() {
        lock.writeLock().lock();
        try {
            if (updates.size() > SNAPSHOT_INTERVAL * 2) {
                // 스냅샷 생성
                createSnapshot();
                
                // 스냅샷 이전의 업데이트 제거
                List<byte[]> newUpdates = new ArrayList<>();
                newUpdates.add(snapshot);
                newUpdates.addAll(updates.subList(snapshotVersion, updates.size()));
                
                updates.clear();
                updates.addAll(newUpdates);
                snapshotVersion = 0;
            }
        } finally {
            lock.writeLock().unlock();
        }
    }
}