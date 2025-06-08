package com.wiki.service;

import com.wiki.dto.UserDto;
import com.wiki.entity.User;
import com.wiki.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 사용자 관리를 위한 서비스 클래스
 * SOLID 원칙에 따라 사용자 관련 비즈니스 로직을 단일 책임으로 관리
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    
    private final UserRepository userRepository;
    
    {
        System.out.println("★★★ UserService 생성됨 ★★★");
    }
    
    /**
     * 로그인 처리
     * 
     * @param loginRequest 로그인 요청 정보
     * @return 로그인 응답 정보
     * @throws IllegalArgumentException 로그인 실패 시
     */
    public UserDto.Response.Login login(UserDto.Request.Login loginRequest) {
        System.out.println("로그인 시도: " + loginRequest.getLoginId());
        
        Optional<User> userOptional = userRepository.findByLoginIdAndIsActive(
            loginRequest.getLoginId(), true);
        
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("사용자를 찾을 수 없습니다.");
        }
        
        User user = userOptional.get();
        
        // 비밀번호 확인 (실제 환경에서는 암호화된 비밀번호와 비교해야 함)
        if (!user.getPassword().equals(loginRequest.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
        
        System.out.println("로그인 성공: " + user.getUserName());
        
        UserDto.Response.Login response = new UserDto.Response.Login();
        response.setStaffId(user.getStaffId());
        response.setLoginId(user.getLoginId());
        response.setUserName(user.getUserName());
        response.setEmail(user.getEmail());
        response.setToken("session-" + user.getStaffId()); // 간단한 세션 토큰
        
        return response;
    }
    
    /**
     * 사용자 생성
     * 
     * @param createRequest 사용자 생성 요청
     * @return 생성된 사용자 정보
     */
    @Transactional
    public UserDto.Response.Detail createUser(UserDto.Request.Create createRequest) {
        System.out.println("사용자 생성 요청: " + createRequest.getLoginId());
        
        // 로그인 ID 중복 확인
        if (userRepository.existsByLoginId(createRequest.getLoginId())) {
            throw new IllegalArgumentException("이미 존재하는 로그인 ID입니다.");
        }
        
        // STAFF_ID 중복 확인
        if (userRepository.existsById(createRequest.getStaffId())) {
            throw new IllegalArgumentException("이미 존재하는 직원 ID입니다.");
        }
        
        User user = new User(
            createRequest.getStaffId(),
            createRequest.getLoginId(),
            createRequest.getPassword(), // 실제 환경에서는 암호화 필요
            createRequest.getUserName()
        );
        user.setEmail(createRequest.getEmail());
        
        User savedUser = userRepository.save(user);
        System.out.println("사용자 생성 완료: " + savedUser.getUserName());
        
        return convertToDetail(savedUser);
    }
    
    /**
     * 사용자 정보 조회
     * 
     * @param staffId 직원 ID
     * @return 사용자 정보
     */
    public UserDto.Response.Detail getUserDetail(String staffId) {
        User user = userRepository.findById(staffId)
            .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다: " + staffId));
        
        return convertToDetail(user);
    }
    
    /**
     * 모든 사용자 목록 조회
     * 
     * @return 사용자 목록
     */
    public List<UserDto.Response.Summary> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream()
            .map(this::convertToSummary)
            .collect(Collectors.toList());
    }
    
    /**
     * 현재 로그인한 사용자 정보 조회 (세션에서)
     * 
     * @param token 세션 토큰
     * @return 사용자 정보
     */
    public UserDto.Response.Login getCurrentUser(String token) {
        if (token == null || !token.startsWith("session-")) {
            throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        }
        
        String staffId = token.replace("session-", "");
        User user = userRepository.findById(staffId)
            .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다."));
        
        UserDto.Response.Login response = new UserDto.Response.Login();
        response.setStaffId(user.getStaffId());
        response.setLoginId(user.getLoginId());
        response.setUserName(user.getUserName());
        response.setEmail(user.getEmail());
        response.setToken(token);
        
        return response;
    }
    
    /**
     * User 엔티티를 Detail DTO로 변환
     */
    private UserDto.Response.Detail convertToDetail(User user) {
        UserDto.Response.Detail detail = new UserDto.Response.Detail();
        detail.setStaffId(user.getStaffId());
        detail.setLoginId(user.getLoginId());
        detail.setUserName(user.getUserName());
        detail.setEmail(user.getEmail());
        detail.setIsActive(user.getIsActive());
        detail.setCreatedAt(user.getCreatedAt());
        detail.setUpdatedAt(user.getUpdatedAt());
        return detail;
    }
    
    /**
     * User 엔티티를 Summary DTO로 변환
     */
    private UserDto.Response.Summary convertToSummary(User user) {
        UserDto.Response.Summary summary = new UserDto.Response.Summary();
        summary.setStaffId(user.getStaffId());
        summary.setLoginId(user.getLoginId());
        summary.setUserName(user.getUserName());
        summary.setIsActive(user.getIsActive());
        summary.setCreatedAt(user.getCreatedAt());
        return summary;
    }
} 