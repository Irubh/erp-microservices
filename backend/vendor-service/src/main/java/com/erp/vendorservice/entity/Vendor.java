package com.erp.vendorservice.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "vendors")
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String contact;
    private Double rating;

    public Vendor() {}

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String email) {
        this.contact = contact;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(String phone) {
        this.rating = rating;
    }
}