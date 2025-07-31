package com.wiki.controller;

import com.wiki.dto.UserDto;
import com.wiki.service.UserService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 사용자 관리 API 컨트롤러
 * REST API 설계 원칙에 따라 사용자 관련 엔드포인트를 관리
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {
    
    private final UserService userService;
    
    {
        System.out.println("★★★ UserController 생성됨 - /api/users 경로 매핑 ★★★");
    }
    
    /**
     * 로그인 처리
     * 
     * @param loginRequest 로그인 요청
     * @param session HTTP 세션
     * @return 로그인 응답
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserDto.Request.Login loginRequest, 
                                   HttpSession session) {
        System.out.println("★★★ /api/users/login POST 요청 수신 ★★★");
        try {
            UserDto.Response.Login loginResponse = userService.login(loginRequest);
            
            // 세션에 사용자 정보 저장
            session.setAttribute("user", loginResponse);
            session.setAttribute("token", loginResponse.getToken());
            session.setAttribute("staffId", loginResponse.getStaffId());
            
            return ResponseEntity.ok(loginResponse);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("로그인 처리 중 오류가 발생했습니다.");
        }
    }
    
    /**
     * 로그아웃 처리
     * 
     * @param session HTTP 세션
     * @return 성공 응답
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        try {
            session.invalidate();
            return ResponseEntity.ok("로그아웃되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("로그아웃 처리 중 오류가 발생했습니다.");
        }
    }
    
    /**
     * 현재 로그인한 사용자 정보 조회
     * 
     * @param session HTTP 세션
     * @return 사용자 정보
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        try {
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            return ResponseEntity.ok(user);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("사용자 정보 조회 중 오류가 발생했습니다.");
        }
    }
    
    /**
     * 사용자 생성
     * 
     * @param createRequest 사용자 생성 요청
     * @return 생성된 사용자 정보
     */
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody UserDto.Request.Create createRequest) {
        try {
            UserDto.Response.Detail createdUser = userService.createUser(createRequest);
            return ResponseEntity.ok(createdUser);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("사용자 생성 중 오류가 발생했습니다.");
        }
    }
    
    /**
     * 모든 사용자 목록 조회
     * 
     * @return 사용자 목록
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        try {
            List<UserDto.Response.Summary> users = userService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("사용자 목록 조회 중 오류가 발생했습니다.");
        }
    }
    
    /**
     * 특정 사용자 정보 조회
     * 
     * @param staffId 직원 ID
     * @return 사용자 정보
     */
    @GetMapping("/{staffId}")
    public ResponseEntity<?> getUserDetail(@PathVariable String staffId) {
        try {
            UserDto.Response.Detail user = userService.getUserDetail(staffId);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    /**
     * 비밀번호 변경
     * 
     * @param request 비밀번호 변경 요청 (현재 비밀번호, 새 비밀번호)
     * @param session HTTP 세션
     * @return 성공 응답
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request, 
                                          HttpSession session) {
        try {
            UserDto.Response.Login user = (UserDto.Response.Login) session.getAttribute("user");
            
            if (user == null) {
                return ResponseEntity.status(401).body("로그인이 필요합니다.");
            }
            
            String currentPassword = request.get("currentPassword");
            String newPassword = request.get("newPassword");
            
            userService.changePassword(user.getStaffId(), currentPassword, newPassword);
            
            return ResponseEntity.ok(Map.of("message", "비밀번호가 성공적으로 변경되었습니다."));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "비밀번호 변경 중 오류가 발생했습니다."));
        }
    }
} 