package com.wiki.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.UnknownHostException;
import java.util.Enumeration;

@RestController
public class ConfigController {
    
    private static final Logger logger = LoggerFactory.getLogger(ConfigController.class);
    
    @Value("${server.port:3001}")
    private String serverPort;

    @GetMapping(value = "/config.js", produces = "application/javascript")
    public String getConfig() {
        String serverHost = getServerIP();
        String apiUrl = String.format("http://%s:%s", serverHost, serverPort);
        
        String config = String.format("window.APP_CONFIG = { API_URL: '%s' };", apiUrl);
        logger.info("Generated config.js with API_URL: {}", apiUrl);
        return config;
    }

    private String getServerIP() {
        try {
            // 1. 먼저 네트워크 인터페이스를 통해 실제 IP 주소 찾기
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface networkInterface = interfaces.nextElement();
                
                // 루프백이 아니고 활성화된 인터페이스만 확인
                if (!networkInterface.isLoopback() && networkInterface.isUp()) {
                    Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
                    while (addresses.hasMoreElements()) {
                        InetAddress address = addresses.nextElement();
                        
                        // IPv4 주소이고 사설 IP 범위에 있는 경우
                        if (!address.isLoopbackAddress() && 
                            address.getHostAddress().indexOf(':') == -1 &&
                            (address.getHostAddress().startsWith("192.168.") ||
                             address.getHostAddress().startsWith("10.") ||
                             address.getHostAddress().startsWith("172."))) {
                            
                            logger.info("자동 감지된 서버 IP: {}", address.getHostAddress());
                            return address.getHostAddress();
                        }
                    }
                }
            }
            
            // 2. 네트워크 인터페이스에서 찾지 못한 경우 기본 방법 사용
            InetAddress localHost = InetAddress.getLocalHost();
            String hostAddress = localHost.getHostAddress();
            
            // 루프백 주소가 아닌 경우 사용
            if (!hostAddress.equals("127.0.0.1")) {
                logger.info("기본 방법으로 감지된 서버 IP: {}", hostAddress);
                return hostAddress;
            }
            
        } catch (Exception e) {
            logger.warn("IP 주소 자동 감지 실패: {}", e.getMessage());
        }
        
        // 3. 모든 방법이 실패한 경우 localhost 사용
        logger.info("IP 주소 자동 감지 실패, localhost 사용");
        return "localhost";
    }
} 