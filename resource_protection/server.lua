local resourceName = GetCurrentResourceName()
local botApiUrl = "http://127.0.0.1:3000" -- ⚠️ Mets l'IP/port de ton bot

local function getServerIP()
    local handle = io.popen("curl -s ifconfig.me")
    local result = handle:read("*a")
    handle:close()
    return (result or ""):gsub("%s+", "")
end

Citizen.CreateThread(function()
    local ip = getServerIP()
    print(("🔎 Vérification IP pour la ressource %s (%s)"):format(resourceName, ip))

    PerformHttpRequest(botApiUrl .. "/checkip?ip=" .. ip, function(err, text, headers)
        if err ~= 200 or text ~= "ALLOWED" then
            print("❌ IP non autorisée, arrêt de la ressource...")
            PerformHttpRequest(botApiUrl .. "/logdenied?ip=" .. ip, function() end, "GET")
            StopResource(resourceName)
        else
            print("✅ IP autorisée, ressource active.")
        end
    end, "GET")
end)
