import * as z from "zod";

// Domyślne komunikaty Zod po polsku. Pola mają własne komunikaty, ale gdy
// trafi się przypadek bez nich (brakujące pole, zły typ), użytkownik dostawał
// angielskie „Invalid input". Moduł jest importowany przez każdy plik ze
// schematami, więc konfiguracja działa, zanim cokolwiek zostanie sprawdzone.
z.config(z.locales.pl());
