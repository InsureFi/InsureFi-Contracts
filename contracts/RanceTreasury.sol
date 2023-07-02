//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IRanceTreasury.sol";

// A Smart-contract that holds the insurance protocol funds
contract RanceTreasury is AccessControl, IRanceTreasury{
    using SafeERC20 for IERC20;

    //protocol address
    address public protocol;

    //create a mapping so other addresses can interact with this wallet. 
    mapping(address => bool) private _admins;

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
        _setupRole("admin", _admin); 
        _admins[_admin] = true;
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
     * @notice sets the address of the insurance protocol contract 
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
    function addAdmin(address admin) 
        onlyRole("admin")
        public {
       _admins[admin] = true;
        _grantRole("admin", admin);
    }
    
    //remove an admin from the treasury.
    function removeAdmin(address admin)
        onlyRole("admin")
        public {
        _admins[admin] = false;   
        _revokeRole("admin", admin);
    }


    /**
     * @notice withdraw cro
     * @param _amount the withdrawal amount
     */
    function withdraw(uint _amount) public override onlyRole("admin"){
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
        public 
        override
        onlyAuthorized{
        IERC20(_token).safeTransfer(_to, _amount);
        emit Withdraw(_to, _amount);
    }

    receive () external payable{
        
    }
    
}