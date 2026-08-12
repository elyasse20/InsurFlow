package com.insurflow.assurance.config;

import com.insurflow.assurance.model.User;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.List;

/**
 * Custom Mongo Configuration.
 * Registers custom converters to seamlessly map MongoDB's lowercase "admin"/"user" strings
 * to Java's uppercase UserRole.ADMIN/USER enum values, and vice versa.
 */
@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions customConversions() {
        return new MongoCustomConversions(List.of(
            new UserRoleReader(),
            new UserRoleWriter()
        ));
    }

    @ReadingConverter
    public static class UserRoleReader implements Converter<String, User.UserRole> {
        @Override
        public User.UserRole convert(String source) {
            try {
                return User.UserRole.valueOf(source.toUpperCase());
            } catch (IllegalArgumentException e) {
                return User.UserRole.USER;
            }
        }
    }

    @WritingConverter
    public static class UserRoleWriter implements Converter<User.UserRole, String> {
        @Override
        public String convert(User.UserRole source) {
            return source.name().toLowerCase();
        }
    }
}
