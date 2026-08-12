package com.insurflow.assurance.dto;

import com.insurflow.assurance.model.Category;
import com.insurflow.assurance.model.Nature;
import com.insurflow.assurance.model.Parametre;
import com.insurflow.assurance.model.Tva;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** BFF Aggregator DTO for loading all reference data in a single HTTP request. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferentielsResponse {
    private List<Category> categories;
    private List<Nature> natures;
    private List<Parametre> parametres;
    private List<Tva> tvas;
}
