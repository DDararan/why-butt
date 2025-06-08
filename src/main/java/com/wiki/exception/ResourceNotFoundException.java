package com.wiki.exception;

/**
 * 리소스를 찾을 수 없을 때 발생하는 예외
 * 위키 페이지나 댓글 등의 리소스가 존재하지 않는 경우 사용됩니다.
 */
public class ResourceNotFoundException extends RuntimeException {
    
    public ResourceNotFoundException(String message) {
        super(message);
    }
    
    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
} 