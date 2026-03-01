local M = {}

function M.engineModulePrint(message)
    print("[ENGINE-MODULE] " .. message)
end

function M.engineModuleGetBuild()
    return "module-stub-1.0.0"
end

return M
