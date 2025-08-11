/**
 * Y.js 성능 최적화 설정
 * 300KB 이상의 대용량 문서 처리를 위한 최적화 설정
 */

export const YJS_OPTIMIZATION_CONFIG = {
  // 동기화 설정
  sync: {
    // 초기 동기화 시 청크 크기 (바이트)
    initialSyncChunkSize: 50000, // 50KB씩 나누어 처리
    
    // 업데이트 디바운스 시간 (ms)
    updateDebounceTime: 100, // 100ms 디바운스
    
    // 백엔드 동기화 간격 (ms)
    backendSyncInterval: 5000, // 5초마다 백엔드 동기화
  },
  
  // WebSocket 설정
  websocket: {
    // 재연결 시도 간격 (ms)
    reconnectInterval: 3000,
    
    // 최대 재연결 시도 횟수
    maxReconnectAttempts: 5,
    
    // 메시지 압축 사용
    enableCompression: true,
    
    // 배치 처리 설정
    batchUpdates: true,
    batchDelay: 50, // 50ms 배치 지연
  },
  
  // 메모리 최적화
  memory: {
    // 히스토리 최대 크기
    maxHistorySize: 100,
    
    // 가비지 컬렉션 간격 (ms)
    gcInterval: 60000, // 1분마다 GC
    
    // 대용량 문서 임계값 (바이트)
    largeDocumentThreshold: 300000, // 300KB
  },
  
  // 렌더링 최적화
  rendering: {
    // 렌더링 디바운스 시간 (ms)
    renderDebounceTime: 16, // 60fps
    
    // 가상 스크롤 사용 (대용량 문서)
    enableVirtualScrolling: true,
    
    // 뷰포트 외부 렌더링 버퍼 (픽셀)
    viewportBuffer: 500,
  },
  
  // 네트워크 최적화
  network: {
    // 대용량 메시지 분할 전송
    splitLargeMessages: true,
    maxMessageSize: 100000, // 100KB 이상 분할
    
    // 압축 레벨 (1-9)
    compressionLevel: 6,
  }
};

/**
 * 문서 크기에 따른 동적 최적화 설정
 */
export function getOptimizedConfig(documentSize: number) {
  const config = { ...YJS_OPTIMIZATION_CONFIG };
  
  if (documentSize > 500000) { // 500KB 이상
    config.sync.updateDebounceTime = 200;
    config.sync.backendSyncInterval = 10000;
    config.rendering.renderDebounceTime = 32;
    config.network.maxMessageSize = 50000;
    console.log('대용량 문서 감지 - 최적화 설정 적용');
  } else if (documentSize > 300000) { // 300KB 이상
    config.sync.updateDebounceTime = 150;
    config.sync.backendSyncInterval = 7000;
    config.rendering.renderDebounceTime = 24;
    console.log('중대형 문서 감지 - 중간 최적화 설정 적용');
  }
  
  return config;
}

/**
 * 브라우저 성능에 따른 설정 조정
 */
export function adjustConfigForPerformance() {
  const config = { ...YJS_OPTIMIZATION_CONFIG };
  
  // 메모리 체크
  if ('memory' in performance && (performance as any).memory) {
    const memory = (performance as any).memory;
    const usedMemory = memory.usedJSHeapSize;
    const totalMemory = memory.jsHeapSizeLimit;
    const memoryUsage = usedMemory / totalMemory;
    
    if (memoryUsage > 0.7) {
      // 메모리 사용률이 70% 이상이면 더 공격적인 최적화
      config.memory.maxHistorySize = 50;
      config.memory.gcInterval = 30000;
      config.rendering.enableVirtualScrolling = true;
      console.warn('높은 메모리 사용률 감지 - 공격적 최적화 적용');
    }
  }
  
  // CPU 코어 수에 따른 조정
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) {
    config.sync.updateDebounceTime = 200;
    config.rendering.renderDebounceTime = 32;
    console.log('저사양 CPU 감지 - 성능 최적화 적용');
  }
  
  return config;
}