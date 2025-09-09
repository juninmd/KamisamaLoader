using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using KamisamaLoader.Models;
using Newtonsoft.Json;

namespace KamisamaLoader.Services
{
    public class GameBananaService
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private const string ApiBaseUrl = "https://gamebanana.com/apiv11";

        public async Task<List<ModRecord>> GetModsAsync(int gameId, int page = 1)
        {
            var mods = new List<ModRecord>();
            try
            {
                string apiUrl = $"{ApiBaseUrl}/Game/{gameId}/Subfeed?_sSort=default&_nPage={page}";

                HttpResponseMessage response = await _httpClient.GetAsync(apiUrl);
                response.EnsureSuccessStatusCode();

                string jsonResponse = await response.Content.ReadAsStringAsync();
                var apiResponse = JsonConvert.DeserializeObject<GameBananaApiResponse>(jsonResponse);

                if (apiResponse?.Records != null)
                {
                    foreach (var mod in apiResponse.Records)
                    {
                        if (mod.ModelName == "Mod")
                        {
                            mods.Add(mod);
                        }
                    }
                }
            }
            catch (HttpRequestException httpEx)
            {
                // In a real app, use a proper logging framework
                Console.WriteLine($"HTTP request error: {httpEx.Message}");
            }
            catch (JsonSerializationException jsonEx)
            {
                Console.WriteLine($"JSON deserialization error: {jsonEx.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"An unexpected error occurred: {ex.Message}");
            }
            return mods;
        }
    }
}
