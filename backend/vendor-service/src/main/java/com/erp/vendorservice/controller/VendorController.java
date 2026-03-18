package com.erp.vendorservice.controller;

import com.erp.vendorservice.entity.Vendor;
import com.erp.vendorservice.service.VendorService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/vendors") // API path: /vendors
public class VendorController {

    private final VendorService vendorService;

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @GetMapping
    public ResponseEntity<?> getAllVendors(HttpServletRequest request) {
        String role     = (String) request.getAttribute("userRole");
        Object vendorId = request.getAttribute("vendorId");

        // Vendor → only their own record
        if ("vendor".equals(role) && vendorId != null) {
            Vendor vendor = vendorService.getVendorById(
                Long.valueOf(vendorId.toString())
            );
            return ResponseEntity.ok(vendor);
        }

        // Employee → all vendors
        List<Vendor> vendors = vendorService.getAllVendors();
        return ResponseEntity.ok(vendors);
    }
}