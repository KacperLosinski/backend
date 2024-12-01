const axios = require('axios');

// Użyj zmiennej środowiskowej zamiast hardkodowanego URL-a
const COCKTAIL_API_URL = process.env.COCKTAIL_API_URL;

// Funkcja do pobierania szczegółów koktajlu przez ID
const getCocktailById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${COCKTAIL_API_URL}/lookup.php?i=${id}`);

    if (response.data.drinks && response.data.drinks.length > 0) {
      const cocktail = response.data.drinks[0];
      return res.status(200).json({
        success: true,
        data: cocktail,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Cocktail not found',
      });
    }
  } catch (error) {
    console.error('Error fetching cocktail by ID:', error.message);
    console.error('Detailed error:', error.response?.data || error);

    return res.status(500).json({
      success: false,
      message: 'Error fetching cocktail by ID',
      error: error.message,
    });
  }
};

module.exports = {
  getCocktailById,
};
