using Newtonsoft.Json;
using System.Collections.Generic;

namespace KamisamaLoader.Models
{
    // Classe raiz para a resposta da API do GameBanana
    public class GameBananaApiResponse
    {
        [JsonProperty("_aMetadata")]
        public Metadata Metadata { get; set; }

        [JsonProperty("_aRecords")]
        public List<ModRecord> Records { get; set; }
    }

    public class Metadata
    {
        [JsonProperty("_nRecordCount")]
        public int RecordCount { get; set; }

        [JsonProperty("_nPerpage")]
        public int PerPage { get; set; }

        [JsonProperty("_bIsComplete")]
        public bool IsComplete { get; set; }
    }

    // Representa um registro de mod individual
    public class ModRecord
    {
        [JsonProperty("_idRow")]
        public int IdRow { get; set; }

        [JsonProperty("_sModelName")]
        public string ModelName { get; set; }

        [JsonProperty("_sSingularTitle")]
        public string SingularTitle { get; set; }

        [JsonProperty("_sIconClasses")]
        public string IconClasses { get; set; }

        [JsonProperty("_sName")]
        public string Name { get; set; }

        [JsonProperty("_sProfileUrl")]
        public string ProfileUrl { get; set; }

        [JsonProperty("_tsDateAdded")]
        public long DateAdded { get; set; }

        [JsonProperty("_tsDateModified")]
        public long DateModified { get; set; }

        [JsonProperty("_bHasFiles")]
        public bool HasFiles { get; set; }

        [JsonProperty("_aTags")]
        public List<string> Tags { get; set; }

        [JsonProperty("_aPreviewMedia")]
        public PreviewMedia PreviewMedia { get; set; }

        [JsonProperty("_aSubmitter")]
        public Submitter Submitter { get; set; }

        [JsonProperty("_aRootCategory")]
        public RootCategory RootCategory { get; set; }

        [JsonProperty("_sVersion")]
        public string Version { get; set; }

        [JsonProperty("_tsDateUpdated")]
        public long? DateUpdated { get; set; }

        [JsonProperty("_bIsObsolete")]
        public bool IsObsolete { get; set; }

        [JsonProperty("_sInitialVisibility")]
        public string InitialVisibility { get; set; }

        [JsonProperty("_bHasContentRatings")]
        public bool HasContentRatings { get; set; }

        [JsonProperty("_nLikeCount")]
        public int? LikeCount { get; set; }

        [JsonProperty("_nPostCount")]
        public int? PostCount { get; set; }

        [JsonProperty("_bWasFeatured")]
        public bool? WasFeatured { get; set; }

        [JsonProperty("_nViewCount")]
        public int? ViewCount { get; set; }

        [JsonProperty("_bIsOwnedByAccessor")]
        public bool? IsOwnedByAccessor { get; set; }

        [JsonProperty("_aStudio")]
        public Studio Studio { get; set; }

        [JsonProperty("_aFiles")]
        public List<ModFile> Files { get; set; }

        [JsonProperty("_sDownloadUrl")]
        public string DownloadUrl { get; set; }

        // Propriedade auxiliar para obter a URL da imagem de preview
        public string PreviewImageUrl
        {
            get
            {
                if (PreviewMedia != null && PreviewMedia.Images != null && PreviewMedia.Images.Count > 0)
                {
                    var img = PreviewMedia.Images.Find(i => !string.IsNullOrEmpty(i.File530));
                    if (img == null)
                        img = PreviewMedia.Images.Find(i => !string.IsNullOrEmpty(i.File220));
                    if (img == null)
                        img = PreviewMedia.Images[0];

                    if (img != null && !string.IsNullOrEmpty(img.BaseUrl) && !string.IsNullOrEmpty(img.File))
                        return $"{img.BaseUrl}/{img.File}";
                }
                return null;
            }
        }
    }

    public class ModFile
    {
        [JsonProperty("_idRow")]
        public int IdRow { get; set; }

        [JsonProperty("_sFile")]
        public string FileName { get; set; }

        [JsonProperty("_nFilesize")]
        public long FileSize { get; set; }

        [JsonProperty("_sDownloadUrl")]
        public string DownloadUrl { get; set; }

        [JsonProperty("_sMd5Checksum")]
        public string Md5Checksum { get; set; }
    }

    public class Submitter
    {
        [JsonProperty("_idRow")]
        public int IdRow { get; set; }

        [JsonProperty("_sName")]
        public string Name { get; set; }

        [JsonProperty("_bIsOnline")]
        public bool IsOnline { get; set; }

        [JsonProperty("_bHasRipe")]
        public bool HasRipe { get; set; }

        [JsonProperty("_sProfileUrl")]
        public string ProfileUrl { get; set; }

        [JsonProperty("_sAvatarUrl")]
        public string AvatarUrl { get; set; }

        [JsonProperty("_aClearanceLevels")]
        public List<string> ClearanceLevels { get; set; }
    }

    public class RootCategory
    {
        [JsonProperty("_sName")]
        public string Name { get; set; }

        [JsonProperty("_sProfileUrl")]
        public string ProfileUrl { get; set; }

        [JsonProperty("_sIconUrl")]
        public string IconUrl { get; set; }
    }

    public class Studio
    {
        [JsonProperty("_sName")]
        public string Name { get; set; }

        [JsonProperty("_sBannerUrl")]
        public string BannerUrl { get; set; }

        [JsonProperty("_sProfileUrl")]
        public string ProfileUrl { get; set; }
    }

    public class PreviewMedia
    {
        [JsonProperty("_aMetadata")]
        public PreviewMediaMetadata Metadata { get; set; }

        [JsonProperty("_aImages")]
        public List<ImageInfo> Images { get; set; }
    }

    public class PreviewMediaMetadata
    {
        [JsonProperty("_nBounty")]
        public int? Bounty { get; set; }

        [JsonProperty("_sSnippet")]
        public string Snippet { get; set; }

        [JsonProperty("_sState")]
        public string State { get; set; }

        [JsonProperty("_nPostCount")]
        public int? PostCount { get; set; }

        [JsonProperty("_sAudioUrl")]
        public string AudioUrl { get; set; }
    }

    public class ImageInfo
    {
        [JsonProperty("_sType")]
        public string Type { get; set; }

        [JsonProperty("_sBaseUrl")]
        public string BaseUrl { get; set; }

        [JsonProperty("_sFile")]
        public string File { get; set; }

        [JsonProperty("_sFile220")]
        public string File220 { get; set; }

        [JsonProperty("_hFile220")]
        public int? HFile220 { get; set; }

        [JsonProperty("_wFile220")]
        public int? WFile220 { get; set; }

        [JsonProperty("_sFile530")]
        public string File530 { get; set; }

        [JsonProperty("_hFile530")]
        public int? HFile530 { get; set; }

        [JsonProperty("_wFile530")]
        public int? WFile530 { get; set; }

        [JsonProperty("_sFile100")]
        public string File100 { get; set; }

        [JsonProperty("_hFile100")]
        public int? HFile100 { get; set; }

        [JsonProperty("_wFile100")]
        public int? WFile100 { get; set; }

        [JsonProperty("_sFile800")]
        public string File800 { get; set; }

        [JsonProperty("_hFile800")]
        public int? HFile800 { get; set; }

        [JsonProperty("_wFile800")]
        public int? WFile800 { get; set; }

        [JsonProperty("_sCaption")]
        public string Caption { get; set; }
    }
}