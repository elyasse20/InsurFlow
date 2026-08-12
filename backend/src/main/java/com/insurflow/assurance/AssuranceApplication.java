package com.insurflow.assurance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class AssuranceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AssuranceApplication.class, args);
    }
}
