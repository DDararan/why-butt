package com.wiki.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 협업 기능을 위한 간단한 사용자 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleUserDto {
    private Long id;
    private String username;
    private String name;
    private String staffId;
}