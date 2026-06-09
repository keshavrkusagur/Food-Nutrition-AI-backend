from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from enum import Enum

class FoodCategory(str, Enum):
    MILK       = "milk_dairy"
    HONEY      = "honey"
    OILS       = "edible_oils"
    SPICES     = "spices"
    TEA_COFFEE = "tea_coffee"
    CEREALS    = "cereals_flour"

class TestMethod(str, Enum):
    NIR            = "nir_spectroscopy"
    CHROMATOGRAPHY = "chromatography"
    CHEMICAL       = "chemical_test"

class DetectionRequest(BaseModel):
    food_category: FoodCategory
    parameters: Dict[str, float] = Field(..., example={"ph": 6.8, "density": 1.02})
    test_method: TestMethod = TestMethod.NIR
    confidence_threshold: float = Field(default=0.75, ge=0.5, le=0.99)

class DetectionResult(str, Enum):
    ADULTERATED  = "ADULTERATED"
    CLEAN        = "CLEAN"
    INCONCLUSIVE = "INCONCLUSIVE"

class DetectionResponse(BaseModel):
    sample_id: str
    result: DetectionResult
    confidence: float
    adulterants_found: List[str]
    model_used: str
    processing_time_ms: int
    timestamp: str
    recommendations: Optional[List[str]] = None
