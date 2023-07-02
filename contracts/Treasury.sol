//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ITreasury.sol";

// A Smart-contract that holds the insurance funds
contract Treasury is AccessControl, ITreasury{
    using SafeERC20 for IERC20;

    //protocol address
    address public protocol;

    address  private ADMIN;

    // Event triggered once an address withdraws from the contract
    event Withdraw(address indexed user, uint amount);


    // Emitted when sport prediction address is set
    event InsuranceProtocolSet( address _address);

    // Restricted to authorised accounts.
    modifier onlyAuthorized() {
        require(isAuthorized(msg.sender), 
        "Treasury:Restricted to only authorized accounts.");
        _;
    }


    constructor(address _admin){
        ADMIN = _admin; 
        _setupRole("admin", _admin);
    }


    /**
     * @notice check if address is authorized 
     * @param account the address of account to be checked
     * @return bool return true if account is authorized and false otherwise
     */
    function isAuthorized(address account)
        public view returns (bool)
    {
        if(hasRole("admin",account)) return true;

        else if(hasRole("protocol", account)) return true;

        return false;
    }


    /**
     * @notice sets the address of the insurance contract 
     * @param _address the address of the contract
     */
    function setInsuranceProtocolAddress(address _address)
        external 
        onlyRole("admin")
    {

        _revokeRole("protocol", protocol);
        protocol = _address;
        _grantRole("protocol", protocol);
        emit InsuranceProtocolSet(_address);
    }

    //this function is used to add admin of the treasury.  OnlyOwner can add addresses.
    function updateAdmin(address admin) 
        onlyRole("admin")
        external {
        _grantRole("admin", admin);
        _revokeRole("admin", ADMIN);
        ADMIN = admin;
    }
    


    /**
     * @notice withdraw eth
     * @param _amount the withdrawal amount
     */
    function withdraw(uint _amount) external override onlyRole("admin"){
        payable(msg.sender).transfer(_amount);
        emit Withdraw(msg.sender, _amount);
    }

    /**
     * @notice withdraw other token
     * @param _token the token address
     * @param _to the spender address
     * @param _amount the deposited amount
     */
    function withdrawToken(address _token, address _to, uint _amount) 
        external 
        override
        onlyAuthorized{
        IERC20(_token).safeTransfer(_to, _amount);
        emit Withdraw(_to, _amount);
    }

    receive () external payable{}
    
}