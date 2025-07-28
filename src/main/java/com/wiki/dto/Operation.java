package com.wiki.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Operation {
    
    public enum Type {
        INSERT, DELETE, RETAIN
    }
    
    private Type type;
    private int position;
    private String content;
    private int length;
    private String userId;
    private long timestamp;
    private long revision;
    
    public static Operation insert(int position, String content, String userId, long revision) {
        Operation op = new Operation();
        op.type = Type.INSERT;
        op.position = position;
        op.content = content;
        op.length = content.length();
        op.userId = userId;
        op.timestamp = System.currentTimeMillis();
        op.revision = revision;
        return op;
    }
    
    public static Operation delete(int position, int length, String userId, long revision) {
        Operation op = new Operation();
        op.type = Type.DELETE;
        op.position = position;
        op.length = length;
        op.userId = userId;
        op.timestamp = System.currentTimeMillis();
        op.revision = revision;
        return op;
    }
} 