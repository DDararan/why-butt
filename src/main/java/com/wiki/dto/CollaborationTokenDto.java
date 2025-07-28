package com.wiki.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollaborationTokenDto {
    private String token;
    private Long userId;
    private String username;
    private String name;
    private Long expiresAt;
}