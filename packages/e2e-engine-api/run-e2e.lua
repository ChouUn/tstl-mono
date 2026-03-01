local stubDir = "./stubs"
package.path = stubDir .. "/?.lua;" .. package.path

require("engine_globals")
dofile("../../dist/bundle.lua")
