//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title the interface for the treasury
/// @notice Declares the functions that the `treasury` contract exposes externally
interface ITreasury {

    // withdraw ETH
    function withdraw(uint _amount)external;

    // withdraw other token
    function withdrawToken(address _token, address _to, uint _amount)external;
}

