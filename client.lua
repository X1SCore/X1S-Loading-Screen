local readyToShutdown = false

RegisterNUICallback('loadingScreenReady', function(_, cb)
    readyToShutdown = true
    if cb then cb('ok') end
end)

AddEventHandler('onClientResourceStart', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    readyToShutdown = false
end)

CreateThread(function()
    for i = 1, 40 do
        SendLoadingScreenMessage(json.encode({ eventName = 'x1sResourcesReady' }))
        if readyToShutdown then break end
        Wait(100)
    end
end)

CreateThread(function()
    while not readyToShutdown do
        Wait(0)
    end

    ShutdownLoadingScreen()
    Wait(0)
    ShutdownLoadingScreenNui()
    DoScreenFadeIn(500)
end)
