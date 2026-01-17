using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using KamisamaLoader.Core.Models;
using System.Linq;

namespace KamisamaLoader.Core.Services
{
    public class GameBananaService
    {
        private readonly HttpClient _httpClient;
        // Updated Game ID for Dragon Ball Sparking! Zero (21179)
        private const string SubfeedUrl = "https://gamebanana.com/apiv11/Game/21179/Subfeed?_sSort=default&_nPage=1";
        private const string ModProfileUrlFormat = "https://gamebanana.com/apiv11/Mod/{0}/ProfilePage";

        public GameBananaService()
        {
            _httpClient = new HttpClient();
        }

        public async Task<List<ModRecord>> GetModsAsync()
        {
            try
            {
                HttpResponseMessage response = await _httpClient.GetAsync(SubfeedUrl);
                response.EnsureSuccessStatusCode();

                string jsonResponse = await response.Content.ReadAsStringAsync();
                GameBananaApiResponse? apiResponse = JsonConvert.DeserializeObject<GameBananaApiResponse>(jsonResponse);

                if (apiResponse != null && apiResponse.Records != null)
                {
                    return apiResponse.Records.Where(m => m.ModelName == "Mod").ToList();
                }
            }
            catch
            {
                // Log error
            }

            return new List<ModRecord>();
        }

        public async Task<ModRecord?> GetModDetailsAsync(int modId)
        {
            try
            {
                string url = string.Format(ModProfileUrlFormat, modId);
                HttpResponseMessage response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                string jsonResponse = await response.Content.ReadAsStringAsync();
                ModRecord? modRecord = JsonConvert.DeserializeObject<ModRecord>(jsonResponse);

                return modRecord;
            }
            catch
            {
                return null;
            }
        }

        public async Task<string?> DownloadFileAsync(string url, string destinationPath)
        {
             try
             {
                 HttpResponseMessage response = await _httpClient.GetAsync(url);
                 response.EnsureSuccessStatusCode();

                 using (var fs = new System.IO.FileStream(destinationPath, System.IO.FileMode.Create))
                 {
                     await response.Content.CopyToAsync(fs);
                 }
                 return destinationPath;
             }
             catch
             {
                 return null;
             }
        }
    }
}
